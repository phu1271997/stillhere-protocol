"""
Property-based regression suite (Loại 5d — formal verification).

Uses ``hypothesis`` to feed randomized inputs into the deterministic
helpers that the frontend and the AI Jury both rely on. Each property
is a claim about the *shape* of the function's behaviour rather than a
single example — so a regression that only appears at an edge (unicode
in profile hash, huge integer confidence, empty CRITICAL flag list…) is
still caught.

Run:
  make fast              # includes this file (auto-marked 'fast')
  pytest -q tests/test_properties.py

Requires:
  pip install hypothesis
"""
from __future__ import annotations

from hypothesis import assume, given, strategies as st, settings, HealthCheck


# ------------------------------------------------------------
# _canon_hash: idempotent, case-insensitive, whitespace-stripping.
# ------------------------------------------------------------

@given(st.text())
def test_canon_hash_idempotent(core, s):
    once = core._canon_hash(s)
    twice = core._canon_hash(once)
    assert once == twice, f"idempotency failure: {s!r} -> {once!r} -> {twice!r}"


@given(st.text())
def test_canon_hash_lowercased(core, s):
    out = core._canon_hash(s)
    assert out == out.lower()


@given(st.text())
def test_canon_hash_stripped(core, s):
    out = core._canon_hash(s)
    if out:
        assert out == out.strip()


@given(st.text(alphabet="0123456789abcdefABCDEF", min_size=1, max_size=64))
def test_canon_hash_case_insensitive_collision(core, s):
    """Same hex string in different cases → same canonical form. Domain
    is hex because on-chain profile_hash is keccak256 output.
    (Unicode case-folding — e.g. German ß.upper() = 'SS' — is out of
    scope for hash inputs.) Guards against Registry double-counting."""
    assume(s.strip() != "")
    a = core._canon_hash(s.upper())
    b = core._canon_hash(s.lower())
    c = core._canon_hash("  " + s + "  ")
    assert a == b == c


# ------------------------------------------------------------
# _normalize_verdict (E4): the LIKELY_SCAM_RING downgrade rule.
# ------------------------------------------------------------

VERDICT_LABELS = st.sampled_from([
    "LIKELY_REAL",
    "INCONCLUSIVE",
    "SUSPICIOUS",
    "LIKELY_SCAM_RING",
])


@given(
    label=VERDICT_LABELS,
    confidence=st.integers(min_value=0, max_value=100),
    critical_count=st.integers(min_value=0, max_value=20),
    thr_conf=st.integers(min_value=50, max_value=99),
    thr_flags=st.integers(min_value=1, max_value=5),
)
def test_normalize_verdict_only_affects_scam_ring(core, label, confidence, critical_count, thr_conf, thr_flags):
    """E4 must never touch labels other than LIKELY_SCAM_RING."""
    out = core._normalize_verdict(label, confidence, critical_count, thr_conf, thr_flags)
    if label != "LIKELY_SCAM_RING":
        assert out == label, f"E4 mutated non-scam label {label!r} into {out!r}"


@given(
    confidence=st.integers(min_value=0, max_value=100),
    critical_count=st.integers(min_value=0, max_value=20),
    thr_conf=st.integers(min_value=50, max_value=99),
    thr_flags=st.integers(min_value=1, max_value=5),
)
def test_normalize_verdict_scam_ring_gate(core, confidence, critical_count, thr_conf, thr_flags):
    """LIKELY_SCAM_RING passes iff BOTH thresholds are met."""
    out = core._normalize_verdict(
        "LIKELY_SCAM_RING", confidence, critical_count, thr_conf, thr_flags,
    )
    should_pass = confidence >= thr_conf and critical_count >= thr_flags
    if should_pass:
        assert out == "LIKELY_SCAM_RING"
    else:
        assert out == "SUSPICIOUS", (
            f"E4 failed to downgrade: conf={confidence} crit={critical_count} "
            f"thr_conf={thr_conf} thr_flags={thr_flags} -> {out!r}"
        )


@given(
    label=st.sampled_from(["LIKELY_REAL", "INCONCLUSIVE", "SUSPICIOUS"]),
    confidence=st.integers(min_value=0, max_value=100),
    critical_count=st.integers(min_value=0, max_value=20),
)
def test_normalize_verdict_idempotent_on_non_scam(core, label, confidence, critical_count):
    once = core._normalize_verdict(label, confidence, critical_count, 85, 2)
    twice = core._normalize_verdict(once, confidence, critical_count, 85, 2)
    assert once == twice


# ------------------------------------------------------------
# _canary_token: format, uniqueness across rounds, injectivity per (id, round).
# ------------------------------------------------------------

@given(case_id=st.integers(min_value=0, max_value=10_000_000))
def test_canary_round_tags_are_disjoint(core, case_id):
    """Request-round and dispute-round canaries for the same case_id
    must differ — otherwise a validator can't tell which round it's
    looking at."""
    req = core._canary_token(case_id, False)
    dis = core._canary_token(case_id, True)
    assert req != dis
    assert req.startswith("SH-R-")
    assert dis.startswith("SH-D-")


@given(case_id=st.integers(min_value=0, max_value=99_999_999))
def test_canary_padded_to_eight_digits(core, case_id):
    tok = core._canary_token(case_id, False)
    # Shape: SH-R-XXXXXXXX-CANARY  → position of digits is 5..13.
    assert tok.startswith("SH-R-") and tok.endswith("-CANARY")
    digits = tok[5:13]
    assert digits.isdigit()
    assert len(digits) == 8


@given(
    a=st.integers(min_value=0, max_value=99_999_999),
    b=st.integers(min_value=0, max_value=99_999_999),
)
def test_canary_injective_per_id(core, a, b):
    """Different case_ids → different canaries (per round). Prevents
    cross-case canary reuse."""
    assume(a != b)
    assert core._canary_token(a, False) != core._canary_token(b, False)
    assert core._canary_token(a, True) != core._canary_token(b, True)


# ------------------------------------------------------------
# _strip_canary: never leaves the canary intact, always terminates.
# ------------------------------------------------------------

@given(
    payload=st.text(min_size=0, max_size=300),
    case_id=st.integers(min_value=0, max_value=99_999_999),
    is_dispute=st.booleans(),
)
def test_strip_canary_never_leaks(core, payload, case_id, is_dispute):
    canary = core._canary_token(case_id, is_dispute)
    poisoned = f"prefix {canary} middle {canary} suffix {payload}"
    scrubbed = core._strip_canary(poisoned, canary)
    assert canary not in scrubbed


@given(payload=st.text(min_size=0, max_size=300))
def test_strip_canary_leaves_absent_text_untouched(core, payload):
    canary = "SH-R-99999999-CANARY"
    assume(canary not in payload)
    assert core._strip_canary(payload, canary) == payload


# ------------------------------------------------------------
# _extract_json: never crashes, only accepts dict-typed roots.
# ------------------------------------------------------------

@given(st.text(max_size=400))
@settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_extract_json_never_crashes(core, raw):
    out = core._extract_json(raw)
    assert out is None or isinstance(out, dict)


@given(
    label=VERDICT_LABELS,
    confidence=st.integers(min_value=0, max_value=100),
)
def test_extract_json_roundtrips_well_formed_dict(core, label, confidence):
    """A well-formed JSON dict roundtrips through _extract_json."""
    import json as _json
    payload = {"label": label, "confidence": confidence, "reason": "x"}
    raw = _json.dumps(payload)
    out = core._extract_json(raw)
    assert out == payload


# ------------------------------------------------------------
# Validator-agreement semantics — the actual property the AI Jury
# consensus binds on. Ignores free-text; requires verdict + confidence
# tolerance + category set.
# ------------------------------------------------------------

RED_FLAG_CATS = st.sampled_from([
    "STOLEN_PHOTO", "SCRIPT_LANGUAGE", "MONEY_REQUEST_EARLY", "IDENTITY_MISMATCH",
    "NO_DIGITAL_FOOTPRINT", "URGENT_EMOTIONAL", "UNVERIFIABLE_JOB", "INCONSISTENT_TIMEZONE",
])

SEVERITY = st.sampled_from(["CRITICAL", "WARNING", "INFO"])


def _flag(cat, sev, evidence):
    return {"category": cat, "severity": sev, "evidence": evidence}


def _agrees(mine, leader, core):
    if mine["label"] != leader["label"]:
        return False
    if abs(int(mine["confidence"]) - int(leader["confidence"])) > 10:
        return False
    def cats(x, sev):
        return sorted({f.get("category") for f in x.get("red_flags", [])
                       if isinstance(f, dict) and f.get("severity") == sev})
    if cats(mine, core.SEVERITY_CRITICAL) != cats(leader, core.SEVERITY_CRITICAL):
        return False
    if cats(mine, core.SEVERITY_WARNING) != cats(leader, core.SEVERITY_WARNING):
        return False
    return True


@given(
    label=VERDICT_LABELS,
    conf_a=st.integers(min_value=0, max_value=100),
    conf_delta=st.integers(min_value=-20, max_value=20),
    reason_a=st.text(min_size=0, max_size=80),
    reason_b=st.text(min_size=0, max_size=80),
    flag_cats=st.lists(RED_FLAG_CATS, min_size=0, max_size=5, unique=True),
    flag_sevs=st.lists(SEVERITY, min_size=0, max_size=5),
)
def test_validator_agrees_when_meaning_matches(core, label, conf_a, conf_delta, reason_a, reason_b, flag_cats, flag_sevs):
    """Two validators with identical verdict + identical CRITICAL/WARNING
    category sets + confidence within ±10 must agree even when reasons and
    evidence phrasing differ."""
    conf_b = max(0, min(100, conf_a + conf_delta))
    effective_delta = abs(conf_b - conf_a)
    pairs = list(zip(flag_cats, flag_sevs))
    leader_flags = [_flag(c, s, "leader wording") for c, s in pairs]
    mine_flags = [_flag(c, s, "mine wording") for c, s in pairs]
    leader = {"label": label, "confidence": conf_a, "reason": reason_a, "red_flags": leader_flags}
    mine = {"label": label, "confidence": conf_b, "reason": reason_b, "red_flags": mine_flags}
    if effective_delta <= 10:
        assert _agrees(mine, leader, core)
    else:
        assert not _agrees(mine, leader, core)


@given(
    label=VERDICT_LABELS,
    confidence=st.integers(min_value=0, max_value=100),
    swap_a=RED_FLAG_CATS,
    swap_b=RED_FLAG_CATS,
)
def test_validator_disagrees_on_swapped_critical_category(core, label, confidence, swap_a, swap_b):
    """Two validators agreeing on the verdict but swapping which category
    is CRITICAL must NOT agree."""
    assume(swap_a != swap_b)
    leader = {
        "label": label, "confidence": confidence, "reason": "x",
        "red_flags": [_flag(swap_a, "CRITICAL", "a")],
    }
    mine = {
        "label": label, "confidence": confidence, "reason": "x",
        "red_flags": [_flag(swap_b, "CRITICAL", "b")],
    }
    assert not _agrees(mine, leader, core)
