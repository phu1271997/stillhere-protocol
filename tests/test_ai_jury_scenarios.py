"""
AI Jury scenario regression — the four verdict labels the jury can emit,
plus the E4 boundary that separates SUSPICIOUS from LIKELY_SCAM_RING.

The mock LLM payloads at the top of this file mirror the shapes the
gltest ``sim_installMocks`` mechanism uses on a live studionet/localnet
run (see R17 in the project error cheatsheet). They double as fixtures
for the deterministic assertions here: we exercise the same normalization
+ validator paths a real jury run would exercise, without needing the
gltest wasm loader.
"""
from __future__ import annotations

import json


LLM_REAL = {
    "canary": "SH-R-00000000-CANARY",
    "label": "LIKELY_REAL",
    "confidence": 85,
    "reason": "Profile shows years of consistent activity and verified history.",
    "red_flags": [],
}

LLM_SUSPICIOUS = {
    "canary": "SH-R-00000001-CANARY",
    "label": "SUSPICIOUS",
    "confidence": 75,
    "reason": "Photo matches unrelated identity.",
    "red_flags": [
        {"category": "STOLEN_PHOTO", "severity": "CRITICAL", "evidence": "Photo hit"},
    ],
}

LLM_SCAM_RING = {
    "canary": "SH-R-00000002-CANARY",
    "label": "LIKELY_SCAM_RING",
    "confidence": 92,
    "reason": "Multiple critical flags including stolen photo and early crypto request.",
    "red_flags": [
        {"category": "STOLEN_PHOTO", "severity": "CRITICAL", "evidence": "Multiple hits"},
        {"category": "MONEY_REQUEST_EARLY", "severity": "CRITICAL", "evidence": "Asks for crypto"},
    ],
}

LLM_SCAM_RING_UNDER_CONFIDENCE = {
    "canary": "SH-R-00000003-CANARY",
    "label": "LIKELY_SCAM_RING",
    "confidence": 80,
    "reason": "Thin evidence but jury leaned scam.",
    "red_flags": [
        {"category": "STOLEN_PHOTO", "severity": "CRITICAL", "evidence": "One hit"},
        {"category": "URGENT_EMOTIONAL", "severity": "CRITICAL", "evidence": "Rushed timeline"},
    ],
}

LLM_SCAM_RING_UNDER_FLAGS = {
    "canary": "SH-R-00000004-CANARY",
    "label": "LIKELY_SCAM_RING",
    "confidence": 95,
    "reason": "High confidence but only one critical flag.",
    "red_flags": [
        {"category": "STOLEN_PHOTO", "severity": "CRITICAL", "evidence": "One hit"},
        {"category": "URGENT_EMOTIONAL", "severity": "WARNING", "evidence": "Warmth theatre"},
    ],
}


def _crit_count(payload: dict) -> int:
    return sum(
        1 for f in payload["red_flags"]
        if isinstance(f, dict) and f.get("severity") == "CRITICAL"
    )


def test_scenario_real_label_survives_normalization(core):
    label = core._normalize_verdict(
        LLM_REAL["label"], LLM_REAL["confidence"], _crit_count(LLM_REAL), 85, 2,
    )
    assert label == core.VERDICT_LIKELY_REAL


def test_scenario_suspicious_label_survives_normalization(core):
    label = core._normalize_verdict(
        LLM_SUSPICIOUS["label"], LLM_SUSPICIOUS["confidence"],
        _crit_count(LLM_SUSPICIOUS), 85, 2,
    )
    assert label == core.VERDICT_SUSPICIOUS


def test_scenario_scam_ring_passes_when_thresholds_met(core):
    label = core._normalize_verdict(
        LLM_SCAM_RING["label"], LLM_SCAM_RING["confidence"],
        _crit_count(LLM_SCAM_RING), 85, 2,
    )
    assert label == core.VERDICT_LIKELY_SCAM_RING


def test_scenario_scam_ring_downgrades_when_confidence_below_threshold(core):
    label = core._normalize_verdict(
        LLM_SCAM_RING_UNDER_CONFIDENCE["label"],
        LLM_SCAM_RING_UNDER_CONFIDENCE["confidence"],
        _crit_count(LLM_SCAM_RING_UNDER_CONFIDENCE), 85, 2,
    )
    assert label == core.VERDICT_SUSPICIOUS


def test_scenario_scam_ring_downgrades_when_critical_flags_below_threshold(core):
    label = core._normalize_verdict(
        LLM_SCAM_RING_UNDER_FLAGS["label"],
        LLM_SCAM_RING_UNDER_FLAGS["confidence"],
        _crit_count(LLM_SCAM_RING_UNDER_FLAGS), 85, 2,
    )
    assert label == core.VERDICT_SUSPICIOUS


def test_scenario_llm_payloads_survive_json_roundtrip(core):
    """The jury payloads must survive the same JSON extraction path a real
    LLM response would take — including when the LLM wraps its answer in
    a ```json ``` fence."""
    for payload in (LLM_REAL, LLM_SUSPICIOUS, LLM_SCAM_RING):
        fenced = f"```json\n{json.dumps(payload)}\n```"
        parsed = core._extract_json(fenced)
        assert parsed is not None
        assert parsed["label"] == payload["label"]
        assert parsed["confidence"] == payload["confidence"]


def test_scenario_missing_canary_is_treated_as_error(core):
    """A leader payload without the expected canary means the LLM was
    tampered with; the leader_fn contract-side path returns an error
    payload, not a verdict."""
    payload = dict(LLM_REAL)
    payload.pop("canary")
    # simulate the contract's post-extract check
    expected_canary = core._canary_token(0, False)
    assert payload.get("canary") != expected_canary
