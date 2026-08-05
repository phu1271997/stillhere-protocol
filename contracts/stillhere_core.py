# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

import json
import re
import typing
from dataclasses import dataclass

VERDICT_LIKELY_REAL = "LIKELY_REAL"
VERDICT_INCONCLUSIVE = "INCONCLUSIVE"
VERDICT_SUSPICIOUS = "SUSPICIOUS"
VERDICT_LIKELY_SCAM_RING = "LIKELY_SCAM_RING"

FLAG_STOLEN_PHOTO = "STOLEN_PHOTO"
FLAG_SCRIPT_LANGUAGE = "SCRIPT_LANGUAGE"
FLAG_MONEY_REQUEST_EARLY = "MONEY_REQUEST_EARLY"
FLAG_IDENTITY_MISMATCH = "IDENTITY_MISMATCH"
FLAG_NO_DIGITAL_FOOTPRINT = "NO_DIGITAL_FOOTPRINT"
FLAG_URGENT_EMOTIONAL = "URGENT_EMOTIONAL"
FLAG_UNVERIFIABLE_JOB = "UNVERIFIABLE_JOB"
FLAG_INCONSISTENT_TIMEZONE = "INCONSISTENT_TIMEZONE"

SEVERITY_INFO = "INFO"
SEVERITY_WARNING = "WARNING"
SEVERITY_CRITICAL = "CRITICAL"

STATE_PENDING = "PENDING"
STATE_VERDICT = "VERDICT"
STATE_DISPUTED = "DISPUTED"
STATE_RE_VERDICT = "RE_VERDICT"
STATE_FAILED = "FAILED"

MAX_DISPUTES = 1

@allow_storage
@dataclass
class RedFlag:
    category: str
    severity: str
    evidence: str

@allow_storage
@dataclass
class Verdict:
    label: str
    confidence: u8
    reason: str
    red_flags: DynArray[RedFlag]
    finalized_at: bigint

@allow_storage
@dataclass
class Case:
    requester: Address
    profile_hash: str
    chat_sample_hash: str
    claimed_identity_hash: str
    public_urls: DynArray[str]
    image_urls: DynArray[str]
    fee_paid: bigint
    bounty_pool: bigint
    state: str
    submitted_at: bigint
    verdict_v1: Verdict
    verdict_v2: Verdict
    dispute_evidence_urls: DynArray[str]

@gl.contract_interface
class IRegistry:
    def upsert_status(self, profile_hash: str, verdict_label: str, confidence: u8) -> None: ...
    def subscribe_watcher(self, profile_hash: str, watcher: Address) -> None: ...

def _addr_str(addr: Address) -> str:
    try:
        return addr.as_hex
    except Exception:
        return str(addr)

def _normalize_verdict(raw_label: str, confidence: int, critical_flag_count: int, thr_conf: int, thr_flags: int) -> str:
    if raw_label == VERDICT_LIKELY_SCAM_RING:
        if confidence < thr_conf or critical_flag_count < thr_flags:
            return VERDICT_SUSPICIOUS
    return raw_label

def _extract_json(raw: typing.Any) -> typing.Optional[dict]:
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return None
    s = raw.strip()
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", s, re.DOTALL)
    if m:
        s = m.group(1)
    else:
        start = s.find("{")
        end = s.rfind("}")
        if start >= 0 and end > start:
            s = s[start:end + 1]
    try:
        res = json.loads(s)
        if isinstance(res, dict):
            return res
        return None
    except Exception:
        return None

def _empty_verdict() -> Verdict:
    return Verdict(
        label=VERDICT_INCONCLUSIVE,
        confidence=u8(0),
        reason="",
        red_flags=DynArray[RedFlag](),
        finalized_at=bigint(0),
    )

class Contract(gl.Contract):
    cases: TreeMap[str, Case]
    profile_to_cases: TreeMap[str, DynArray[str]]
    contributions: TreeMap[str, DynArray[str]]
    contributors: TreeMap[str, TreeMap[str, Address]]
    contribution_claimed: TreeMap[str, TreeMap[str, bool]]

    registry: Address
    admin: Address
    treasury: bigint
    next_case_id: bigint

    base_fee: bigint
    dispute_fee: bigint
    contributor_share_bps: u16
    scam_confidence_threshold: u8
    scam_critical_flags_required: u8

    def __init__(self, registry_addr: Address, base_fee: bigint, dispute_fee: bigint, contributor_share_bps: u16, scam_confidence_threshold: u8, scam_critical_flags_required: u8):
        self.admin = gl.message.sender_address
        self.registry = registry_addr
        self.base_fee = base_fee
        self.dispute_fee = dispute_fee
        self.contributor_share_bps = contributor_share_bps
        self.scam_confidence_threshold = scam_confidence_threshold
        self.scam_critical_flags_required = scam_critical_flags_required
        self.next_case_id = bigint(0)
        self.treasury = bigint(0)

    @gl.public.write.payable
    def request_verification(self, profile_hash: str, public_urls: DynArray[str], image_urls: DynArray[str], claimed_identity_hash: str, chat_sample: str, chat_sample_hash: str, bounty_topup: bigint) -> str:
        paid = gl.message.value
        total_required = self.base_fee + bounty_topup
        if paid < total_required:
            raise gl.vm.UserError("insufficient funds sent for fee and bounty topup")
        if len(public_urls) == 0:
            raise gl.vm.UserError("at least one public URL required")
        if len(chat_sample) > 5000:
            raise gl.vm.UserError("chat sample too long (max 5000 chars)")

        case_id_str = str(self.next_case_id)
        self.next_case_id = self.next_case_id + bigint(1)

        self.treasury = self.treasury + self.base_fee

        c = Case(
            requester=gl.message.sender_address,
            profile_hash=profile_hash,
            chat_sample_hash=chat_sample_hash,
            claimed_identity_hash=claimed_identity_hash,
            public_urls=public_urls,
            image_urls=image_urls,
            fee_paid=self.base_fee,
            bounty_pool=bounty_topup,
            state=STATE_PENDING,
            submitted_at=bigint(gl.block.timestamp),
            verdict_v1=_empty_verdict(),
            verdict_v2=_empty_verdict(),
            dispute_evidence_urls=DynArray[str](),
        )
        self.cases[case_id_str] = c

        case_list = self.profile_to_cases.get(profile_hash, DynArray[str]())
        case_list.append(case_id_str)
        self.profile_to_cases[profile_hash] = case_list

        self._run_ai_jury(case_id_str, chat_sample, False)
        return case_id_str

    @gl.public.write
    def contribute_evidence(self, case_id_str: str, evidence_url: str, evidence_hash: str) -> None:
        if case_id_str not in self.cases:
            raise gl.vm.UserError("case not found")
        c = self.cases[case_id_str]
        if c.state == STATE_FAILED:
            raise gl.vm.UserError("cannot contribute to failed case")

        arr = self.contributions.get(case_id_str, DynArray[str]())
        arr.append(evidence_url)
        self.contributions[case_id_str] = arr

        user_map = self.contributors.get(case_id_str, TreeMap[str, Address]())
        user_map[evidence_hash] = gl.message.sender_address
        self.contributors[case_id_str] = user_map

    @gl.public.write.payable
    def file_dispute(self, case_id_str: str, counter_evidence_urls: DynArray[str], chat_sample: str) -> None:
        if case_id_str not in self.cases:
            raise gl.vm.UserError("case not found")
        c = self.cases[case_id_str]
        if c.state != STATE_VERDICT:
            raise gl.vm.UserError("case is not in VERDICT state")
        if gl.message.value < self.dispute_fee:
            raise gl.vm.UserError("insufficient fee for dispute")
        if len(counter_evidence_urls) == 0:
            raise gl.vm.UserError("at least one counter evidence URL required")

        self.treasury = self.treasury + self.dispute_fee
        c.state = STATE_DISPUTED
        c.dispute_evidence_urls = counter_evidence_urls
        self.cases[case_id_str] = c

        self._run_ai_jury(case_id_str, chat_sample, True)

    @gl.public.write
    def claim_contribution_bounty(self, case_id_str: str, evidence_hash: str) -> None:
        if case_id_str not in self.cases:
            raise gl.vm.UserError("case not found")
        user_map = self.contributors.get(case_id_str, TreeMap[str, Address]())
        if evidence_hash not in user_map:
            raise gl.vm.UserError("no contribution registered for this hash")
        contrib_addr = user_map[evidence_hash]
        if contrib_addr != gl.message.sender_address:
            raise gl.vm.UserError("caller is not the registered contributor")

        claimed_map = self.contribution_claimed.get(case_id_str, TreeMap[str, bool]())
        if claimed_map.get(evidence_hash, False):
            raise gl.vm.UserError("bounty already claimed for this contribution")

        c = self.cases[case_id_str]
        v = c.verdict_v2 if c.state == STATE_RE_VERDICT else c.verdict_v1
        if v.label == VERDICT_INCONCLUSIVE or int(c.bounty_pool) == 0:
            raise gl.vm.UserError("no active bounty payout for this verdict")

        share = (c.bounty_pool * bigint(int(self.contributor_share_bps))) // bigint(10000)
        if share == bigint(0):
            raise gl.vm.UserError("calculated share is zero")

        claimed_map[evidence_hash] = True
        self.contribution_claimed[case_id_str] = claimed_map
        c.bounty_pool = c.bounty_pool - share
        self.cases[case_id_str] = c

        gl.get_contract_at(contrib_addr).emit_transfer(value=u256(int(share)))

    @gl.public.write
    def subscribe_watcher(self, profile_hash: str) -> None:
        reg = gl.get_contract_at(self.registry).as_interface(IRegistry)
        reg.subscribe_watcher(profile_hash, gl.message.sender_address)

    @gl.public.view
    def get_case(self, case_id_str: str) -> Case:
        if case_id_str not in self.cases:
            raise gl.vm.UserError("case not found")
        return self.cases[case_id_str]

    @gl.public.view
    def get_verdict(self, case_id_str: str) -> Verdict:
        if case_id_str not in self.cases:
            raise gl.vm.UserError("case not found")
        c = self.cases[case_id_str]
        if c.state == STATE_RE_VERDICT:
            return c.verdict_v2
        return c.verdict_v1

    @gl.public.view
    def list_cases_by_profile(self, profile_hash: str) -> DynArray[str]:
        return self.profile_to_cases.get(profile_hash, DynArray[str]())

    @gl.public.write
    def withdraw_treasury(self, to_addr: Address, amount: bigint) -> None:
        if gl.message.sender_address != self.admin:
            raise gl.vm.UserError("only admin can withdraw treasury")
        if amount > self.treasury:
            raise gl.vm.UserError("insufficient treasury balance")
        self.treasury = self.treasury - amount
        gl.get_contract_at(to_addr).emit_transfer(value=u256(int(amount)))

    def _run_ai_jury(self, case_id_str: str, chat_sample: str, is_dispute_round: bool) -> None:
        c = self.cases[case_id_str]
        public_urls = list(c.public_urls)
        image_urls = list(c.image_urls)
        counter_urls = list(c.dispute_evidence_urls) if is_dispute_round else []
        contrib_urls = list(self.contributions.get(case_id_str, DynArray[str]()))
        scam_thr_c = int(self.scam_confidence_threshold)
        scam_thr_f = int(self.scam_critical_flags_required)

        def leader_fn():
            profile_texts = []
            for u in public_urls[:6]:
                try:
                    t = gl.nondet.web.render(u, mode="text")
                    profile_texts.append({"url": u, "text": (t or "")[:4000]})
                except Exception:
                    profile_texts.append({"url": u, "text": "", "fetch_failed": True})

            if len(profile_texts) > 0 and all(p.get("fetch_failed", False) or not p.get("text") for p in profile_texts):
                return {"error": "ALL_PROFILE_FETCHES_FAILED"}

            image_hits = []
            for img in image_urls[:3]:
                try:
                    q = f"https://tineye.com/result_json/?url={img}"
                    res = gl.nondet.web.get(q)
                    image_hits.append({"image": img, "raw": (res or "")[:1500]})
                except Exception:
                    image_hits.append({"image": img, "unavailable": True})

            contributor_texts = []
            for u in contrib_urls[:5]:
                try:
                    t = gl.nondet.web.render(u, mode="text")
                    contributor_texts.append({"url": u, "text": (t or "")[:2000]})
                except Exception:
                    pass

            counter_texts = []
            for u in counter_urls[:5]:
                try:
                    t = gl.nondet.web.render(u, mode="text")
                    counter_texts.append({"url": u, "text": (t or "")[:2000]})
                except Exception:
                    pass

            prompt = _build_jury_prompt(
                profile_texts=profile_texts,
                image_hits=image_hits,
                chat_sample=chat_sample[:3000],
                contributor_texts=contributor_texts,
                counter_texts=counter_texts,
                is_dispute_round=is_dispute_round,
            )

            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = _extract_json(raw)
            if parsed is None:
                return {"error": "BAD_JSON"}

            req = ("label", "confidence", "reason", "red_flags")
            if not all(k in parsed for k in req):
                return {"error": "MISSING_FIELDS"}

            if parsed["label"] not in (VERDICT_LIKELY_REAL, VERDICT_INCONCLUSIVE, VERDICT_SUSPICIOUS, VERDICT_LIKELY_SCAM_RING):
                return {"error": "BAD_LABEL"}

            if not isinstance(parsed["red_flags"], list):
                return {"error": "BAD_RED_FLAGS_TYPE"}

            crit_count = sum(1 for f in parsed["red_flags"] if isinstance(f, dict) and f.get("severity") == SEVERITY_CRITICAL)
            parsed["label"] = _normalize_verdict(parsed["label"], int(parsed["confidence"]), crit_count, scam_thr_c, scam_thr_f)
            return parsed

        def validator_fn(leader_res: typing.Any) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict):
                return False
            if "error" in leader:
                mine = leader_fn()
                return isinstance(mine, dict) and mine.get("error") == leader["error"]

            mine = leader_fn()
            if not isinstance(mine, dict) or "error" in mine:
                return False

            if mine["label"] != leader["label"]:
                return False

            if abs(int(mine["confidence"]) - int(leader["confidence"])) > 12:
                return False

            def crit_c(x):
                return sum(1 for f in x.get("red_flags", []) if isinstance(f, dict) and f.get("severity") == SEVERITY_CRITICAL)

            if crit_c(mine) != crit_c(leader):
                return False

            def crit_cats(x):
                return sorted({f.get("category") for f in x.get("red_flags", []) if isinstance(f, dict) and f.get("severity") == SEVERITY_CRITICAL})

            if crit_cats(mine) != crit_cats(leader):
                return False

            return True

        result = gl.vm.run_nondet(leader_fn, validator_fn)

        if isinstance(result, dict) and "error" in result:
            c.state = STATE_FAILED
            self.cases[case_id_str] = c
            return

        v = self._build_verdict_from_ai(result)
        if is_dispute_round:
            c.verdict_v2 = v
            c.state = STATE_RE_VERDICT
        else:
            c.verdict_v1 = v
            c.state = STATE_VERDICT

        self.cases[case_id_str] = c

        reg = gl.get_contract_at(self.registry).as_interface(IRegistry)
        reg.upsert_status(c.profile_hash, v.label, v.confidence)

    def _build_verdict_from_ai(self, ai: dict) -> Verdict:
        flags = DynArray[RedFlag]()
        for f in ai.get("red_flags", [])[:20]:
            if isinstance(f, dict):
                cat = str(f.get("category", ""))[:64]
                sev = str(f.get("severity", "INFO"))
                if sev not in (SEVERITY_INFO, SEVERITY_WARNING, SEVERITY_CRITICAL):
                    sev = SEVERITY_INFO
                ev = str(f.get("evidence", ""))[:200]
                flags.append(RedFlag(category=cat, severity=sev, evidence=ev))

        conf = min(100, max(0, int(ai.get("confidence", 0))))
        return Verdict(
            label=str(ai.get("label", VERDICT_INCONCLUSIVE)),
            confidence=u8(conf),
            reason=str(ai.get("reason", ""))[:2000],
            red_flags=flags,
            finalized_at=bigint(gl.block.timestamp),
        )

def _build_jury_prompt(*, profile_texts, image_hits, chat_sample, contributor_texts, counter_texts, is_dispute_round: bool) -> str:
    profile_block = json.dumps(profile_texts, ensure_ascii=False, indent=2)
    image_block = json.dumps(image_hits, ensure_ascii=False, indent=2)
    contrib_block = json.dumps(contributor_texts, ensure_ascii=False, indent=2)
    counter_block = json.dumps(counter_texts, ensure_ascii=False, indent=2)
    dispute_note = "\n\nNOTE: This is a DISPUTE round - counter evidence submitted." if is_dispute_round else ""

    return f"""You are an on-chain AI juror for a romance-scam detection protocol.
Output a SINGLE JSON verdict.

RULES:
1. Do NOT guess real name, address, phone, or workplace.
2. Base verdict ONLY on provided evidence.
3. Reserve LIKELY_SCAM_RING for strong, converging evidence.
4. Prefer INCONCLUSIVE if evidence is thin.

EVIDENCE:
Public profiles:
{profile_block}

Reverse image hits:
{image_block}

Chat sample:
{chat_sample}

Contributed evidence:
{contrib_block}

Counter evidence:
{counter_block}
{dispute_note}

CATEGORIES:
- STOLEN_PHOTO
- SCRIPT_LANGUAGE
- MONEY_REQUEST_EARLY
- IDENTITY_MISMATCH
- NO_DIGITAL_FOOTPRINT
- URGENT_EMOTIONAL
- UNVERIFIABLE_JOB
- INCONSISTENT_TIMEZONE

OUTPUT FORMAT:
{{
  "label": "LIKELY_REAL" | "INCONCLUSIVE" | "SUSPICIOUS" | "LIKELY_SCAM_RING",
  "confidence": 0-100,
  "reason": "2-4 sentences rationale",
  "red_flags": [
    {{
      "category": "CATEGORY_NAME",
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "evidence": "short phrase"
    }}
  ]
}}
"""
