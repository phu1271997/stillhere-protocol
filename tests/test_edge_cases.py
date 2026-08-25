"""
Edge-case regression — the boundary conditions the contract raises
`gl.vm.UserError` for, plus the malformed-input paths the AI Jury must
survive without crashing consensus.

These are the branches that separate "advisory protocol" from "protocol
that pays out incorrectly on garbage input" — cover every one that
frontend UX depends on being loud rather than silent.
"""
from __future__ import annotations

import pytest


# ============================================================
# Malformed LLM output — must not crash validation, must degrade to error
# ============================================================
def test_extract_json_survives_empty_string(core):
    assert core._extract_json("") is None


def test_extract_json_survives_only_whitespace(core):
    assert core._extract_json("   \n\t  ") is None


def test_extract_json_survives_non_dict_root(core):
    # LLM sometimes emits a bare list — must not be accepted as a verdict
    assert core._extract_json("[1,2,3]") is None
    assert core._extract_json('"just a string"') is None


def test_extract_json_survives_trailing_garbage(core):
    # LLM occasionally emits `{...}` then continues chatting; the
    # extractor should still lift the first well-formed object out.
    raw = '{"label":"INCONCLUSIVE","confidence":30} and then some prose'
    assert core._extract_json(raw) == {"label": "INCONCLUSIVE", "confidence": 30}


# ============================================================
# Confidence clamping — user-visible verdict must never fall outside [0, 100]
# ============================================================
def test_confidence_below_scam_threshold_downgrades(core):
    # scam_confidence_threshold = 85 in production
    for conf in (0, 40, 84):
        assert core._normalize_verdict(
            core.VERDICT_LIKELY_SCAM_RING, conf, 3, 85, 2,
        ) == core.VERDICT_SUSPICIOUS


def test_confidence_at_or_above_threshold_holds(core):
    for conf in (85, 90, 100):
        assert core._normalize_verdict(
            core.VERDICT_LIKELY_SCAM_RING, conf, 3, 85, 2,
        ) == core.VERDICT_LIKELY_SCAM_RING


# ============================================================
# Canary — every branch of the tampering path
# ============================================================
def test_canary_is_position_agnostic(core):
    canary = core._canary_token(9, False)
    for wrapper in (
        f"prefix {canary} suffix",
        f"{canary} at start",
        f"at end {canary}",
        f"{canary}{canary}",  # duplicated
    ):
        scrubbed = core._strip_canary(wrapper, canary)
        assert canary not in scrubbed


def test_canary_wrong_round_tag_does_not_match(core):
    """A leader emitting the wrong-round canary must be caught — otherwise
    a re-play attack across rounds succeeds."""
    request_canary = core._canary_token(5, False)
    dispute_canary = core._canary_token(5, True)
    assert request_canary != dispute_canary


# ============================================================
# Hash normalization — the ambient enforcement for E8 lookup
# ============================================================
def test_canon_hash_matches_across_case_only_variations(core):
    """Two hashes that differ only in case must collide under _canon_hash
    — otherwise the Registry aggregate view double-counts."""
    a = core._canon_hash("0xABCdef")
    b = core._canon_hash("0xabcdef")
    c = core._canon_hash("  0xABCDEF  ")
    assert a == b == c


def test_canon_hash_none_returns_empty(core):
    # contract guards `if len(canon_profile) == 0: raise` — hash of None
    # must reach the guard cleanly, not raise AttributeError
    assert core._canon_hash(None) == ""


# ============================================================
# Verdict output shape — always the shape the frontend renders
# ============================================================
def test_verdict_categories_stable_set(core):
    """The eight allowed red-flag categories are baked into the prompt AND
    referenced by the validator category-set match. Adding a new one
    silently would break consensus."""
    prompt = core._build_jury_prompt(
        profile_texts=[], image_hits=[], chat_sample="",
        contributor_texts=[], counter_texts=[], is_dispute_round=False,
        canary=core._canary_token(0, False),
    )
    for cat in (
        core.FLAG_STOLEN_PHOTO,
        core.FLAG_SCRIPT_LANGUAGE,
        core.FLAG_MONEY_REQUEST_EARLY,
        core.FLAG_IDENTITY_MISMATCH,
        core.FLAG_NO_DIGITAL_FOOTPRINT,
        core.FLAG_URGENT_EMOTIONAL,
        core.FLAG_UNVERIFIABLE_JOB,
        core.FLAG_INCONSISTENT_TIMEZONE,
    ):
        assert cat in prompt, f"prompt is missing category {cat}"


def test_verdict_labels_stable_set(core):
    prompt = core._build_jury_prompt(
        profile_texts=[], image_hits=[], chat_sample="",
        contributor_texts=[], counter_texts=[], is_dispute_round=False,
        canary=core._canary_token(0, False),
    )
    for label in (
        core.VERDICT_LIKELY_REAL,
        core.VERDICT_INCONCLUSIVE,
        core.VERDICT_SUSPICIOUS,
        core.VERDICT_LIKELY_SCAM_RING,
    ):
        assert label in prompt, f"prompt is missing label {label}"
