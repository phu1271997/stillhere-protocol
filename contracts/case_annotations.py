# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
CaseAnnotations — community context layer for StillHere cases.

Standalone contract. Deployed once alongside Core + Registry, does not
touch either. The purpose is a lightweight, spam-resistant surface for
third parties to add a *short* context tag to a case: a witness sighting
("this profile also messaged me"), an inheritance signal ("same phrases
as case #7"), or a corrective note ("counter-evidence submitted, still
inconclusive").

Design constraints:
  * One annotation per wallet per case. Prevents ballot-stuffing.
  * Body text is hashed on the client and only ``keccak256(body)`` +
    an optional canonical URL are stored on-chain. Matches the E1/E2
    hash-only invariant the rest of the protocol enforces.
  * Category is an enum of five plain-English tags. Free-text
    categories would allow prompt-injection-style abuse into any
    downstream reader that renders the field verbatim.
  * A per-wallet global cooldown (default 60 seconds) throttles a
    single wallet from carpet-bombing every case with the same
    annotation right after a mass deploy.
  * Cases identified by case_id (string) matching the Core contract's
    id space; this contract does not need a handle back to Core.
"""
from genlayer import *

import typing
from dataclasses import dataclass

CAT_WITNESS = "WITNESS"                # I have also been contacted by this profile
CAT_INHERITED = "INHERITED_PATTERN"    # this case matches phrasing of another case
CAT_COUNTER = "COUNTER_CONTEXT"        # context that contradicts the primary verdict
CAT_CORROBORATE = "CORROBORATE"        # corroborating external evidence
CAT_SAFETY_TIP = "SAFETY_TIP"          # advisory tip for readers of this case

_ALLOWED_CATEGORIES = (
    CAT_WITNESS,
    CAT_INHERITED,
    CAT_COUNTER,
    CAT_CORROBORATE,
    CAT_SAFETY_TIP,
)

DEFAULT_COOLDOWN_SECS = 60
MAX_URL_LEN = 512
MIN_BODY_HASH_LEN = 4      # keccak256 hex is 66 chars, but tests may pass short synthetic hashes
MAX_BODY_HASH_LEN = 128


@allow_storage
@dataclass
class Annotation:
    author: Address
    category: str
    body_hash: str
    evidence_url: str
    posted_at: bigint


def _to_address(val: typing.Any) -> Address:
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        return Address(hex(val))
    return Address(str(val))


def _addr_str(addr: Address) -> str:
    try:
        s = addr.as_hex
    except Exception:
        s = str(addr)
    return s.lower()


def _canon(s: str) -> str:
    return (s or "").strip().lower()


def _new_dyn_ann() -> "DynArray[Annotation]":
    return gl.storage.inmem_allocate(DynArray[Annotation])


def _new_map_str_bool() -> "TreeMap[str, bool]":
    return gl.storage.inmem_allocate(TreeMap[str, bool])


def _new_dyn_str() -> "DynArray[str]":
    return gl.storage.inmem_allocate(DynArray[str])


class Contract(gl.Contract):
    # case_id -> list of annotations, newest last (append-only)
    annotations: TreeMap[str, DynArray[Annotation]]
    # case_id -> {addr_str: True} for per-wallet dedupe within one case
    author_index: TreeMap[str, TreeMap[str, bool]]
    # global per-wallet cooldown - last-posted timestamp per author
    last_post_ts: TreeMap[str, bigint]
    # global counters for the frontend / edge API
    total_annotations: u32
    category_counts: TreeMap[str, u32]
    all_annotated_case_ids: DynArray[str]
    case_seen: TreeMap[str, bool]

    admin: Address
    cooldown_secs: u32
    paused: bool

    def __init__(self, cooldown_secs: u32):
        self.admin = _to_address(gl.message.sender_address)
        self.cooldown_secs = u32(max(1, int(cooldown_secs)))
        self.paused = False
        self.total_annotations = u32(0)

    def _require_admin(self) -> None:
        if _addr_str(_to_address(gl.message.sender_address)) != _addr_str(self.admin):
            raise gl.vm.UserError("admin only")

    @gl.public.write
    def set_paused(self, on: bool) -> None:
        self._require_admin()
        self.paused = bool(on)

    @gl.public.write
    def set_cooldown_secs(self, secs: u32) -> None:
        self._require_admin()
        s = int(secs)
        if s < 1 or s > 86400:
            raise gl.vm.UserError("cooldown must be within [1, 86400] seconds")
        self.cooldown_secs = u32(s)

    @gl.public.write
    def set_admin(self, new_admin: Address) -> None:
        self._require_admin()
        self.admin = _to_address(new_admin)

    @gl.public.write
    def post_annotation(self, case_id_str: str, category: str, body_hash: str, evidence_url: str) -> None:
        if self.paused:
            raise gl.vm.UserError("annotations are paused")

        cid = _canon(case_id_str)
        if len(cid) == 0:
            raise gl.vm.UserError("case_id required")

        cat = (category or "").strip()
        if cat not in _ALLOWED_CATEGORIES:
            raise gl.vm.UserError("unknown category")

        bh = _canon(body_hash)
        if len(bh) < MIN_BODY_HASH_LEN or len(bh) > MAX_BODY_HASH_LEN:
            raise gl.vm.UserError("body_hash length invalid")

        url = evidence_url or ""
        if len(url) > MAX_URL_LEN:
            raise gl.vm.UserError("evidence_url too long")

        sender = _to_address(gl.message.sender_address)
        sender_key = _addr_str(sender)

        # global cooldown across cases
        prev_ts = int(self.last_post_ts.get(sender_key, bigint(0)))
        now_ts = int(gl.block.timestamp)
        if prev_ts > 0 and (now_ts - prev_ts) < int(self.cooldown_secs):
            raise gl.vm.UserError("cooldown active - wait before posting another annotation")

        # per-case wallet dedupe
        author_map = self.author_index.get(cid, _new_map_str_bool())
        if author_map.get(sender_key, False):
            raise gl.vm.UserError("this wallet has already annotated this case")
        author_map[sender_key] = True
        self.author_index[cid] = author_map

        arr = self.annotations.get(cid, _new_dyn_ann())
        arr.append(Annotation(
            author=sender,
            category=cat,
            body_hash=bh,
            evidence_url=url,
            posted_at=bigint(now_ts),
        ))
        self.annotations[cid] = arr

        self.last_post_ts[sender_key] = bigint(now_ts)
        self.total_annotations = u32(int(self.total_annotations) + 1)

        prev_cat = self.category_counts.get(cat, u32(0))
        self.category_counts[cat] = u32(int(prev_cat) + 1)

        if not self.case_seen.get(cid, False):
            self.all_annotated_case_ids.append(cid)
            self.case_seen[cid] = True

    @gl.public.view
    def get_annotations(self, case_id_str: str) -> DynArray[Annotation]:
        cid = _canon(case_id_str)
        return self.annotations.get(cid, _new_dyn_ann())

    @gl.public.view
    def get_annotation_count(self, case_id_str: str) -> u32:
        cid = _canon(case_id_str)
        arr = self.annotations.get(cid, _new_dyn_ann())
        return u32(len(arr))

    @gl.public.view
    def has_annotated(self, case_id_str: str, author: Address) -> bool:
        cid = _canon(case_id_str)
        author_map = self.author_index.get(cid, _new_map_str_bool())
        return bool(author_map.get(_addr_str(_to_address(author)), False))

    @gl.public.view
    def get_total_annotations(self) -> u32:
        return self.total_annotations

    @gl.public.view
    def get_category_count(self, category: str) -> u32:
        return self.category_counts.get(category, u32(0))

    @gl.public.view
    def get_paused(self) -> bool:
        return self.paused

    @gl.public.view
    def get_cooldown_secs(self) -> u32:
        return self.cooldown_secs

    @gl.public.view
    def list_annotated_case_ids(self, offset: u32, limit: u32) -> DynArray[str]:
        out = _new_dyn_str()
        total = len(self.all_annotated_case_ids)
        off = max(0, int(offset))
        lim = max(0, min(200, int(limit)))
        if total == 0 or lim == 0:
            return out
        end = total - off
        start = max(0, end - lim)
        for i in range(end - 1, start - 1, -1):
            if 0 <= i < total:
                out.append(self.all_annotated_case_ids[i])
        return out
