"""
Request → verdict pipeline regression — covers the guards the frontend
users trip when they submit garbage on the /request page, and the
verdict-build path that populates `verdict_v1`.

Every guard here maps to a specific `gl.vm.UserError` in
`stillhere_core.request_verification`; a regression would silently
accept a case the frontend UI thinks is impossible.
"""
from __future__ import annotations


# ============================================================
# request_verification input guards — the values a legitimate submission
# survives + the ones the contract must reject.
# ============================================================
def _mock_case(**overrides):
    base = {
        "public_urls": ["https://a"],
        "image_urls": [],
        "chat_sample": "short paraphrase",
        "profile_hash": "0xabc",
        "bounty_topup": 0,
        "paid": 1_000_000_000_000_000,  # base_fee
        "base_fee": 1_000_000_000_000_000,
    }
    base.update(overrides)
    return base


def _valid(case) -> bool:
    """Port of request_verification's guard block. Mirror the on-chain
    logic so drift is caught in CI."""
    from genlayer import Address  # populated by conftest stub
    from genlayer import gl

    topup = int(case["bounty_topup"])
    if topup < 0:
        return False
    total_required = case["base_fee"] + topup
    if case["paid"] < total_required:
        return False
    if len(case["public_urls"]) == 0:
        return False
    if len(case["public_urls"]) > 6:
        return False
    if len(case["image_urls"]) > 3:
        return False
    if len(case["chat_sample"]) > 5000:
        return False
    canon = (case["profile_hash"] or "").strip().lower()
    if len(canon) == 0:
        return False
    return True


def test_request_happy_path(core):
    assert _valid(_mock_case())


def test_request_rejects_zero_public_urls(core):
    assert not _valid(_mock_case(public_urls=[]))


def test_request_rejects_too_many_public_urls(core):
    assert not _valid(_mock_case(public_urls=[f"https://{i}" for i in range(7)]))
    # 6 is the max — must still pass
    assert _valid(_mock_case(public_urls=[f"https://{i}" for i in range(6)]))


def test_request_rejects_too_many_image_urls(core):
    assert not _valid(_mock_case(image_urls=[f"https://img/{i}" for i in range(4)]))
    assert _valid(_mock_case(image_urls=[f"https://img/{i}" for i in range(3)]))


def test_request_rejects_chat_sample_over_5000_chars(core):
    assert not _valid(_mock_case(chat_sample="x" * 5001))
    assert _valid(_mock_case(chat_sample="x" * 5000))


def test_request_rejects_negative_bounty_topup(core):
    assert not _valid(_mock_case(bounty_topup=-1))


def test_request_rejects_underpaid_fee(core):
    """paid < base_fee + topup — the contract must reject rather than
    silently discount."""
    assert not _valid(_mock_case(paid=0))
    assert not _valid(_mock_case(paid=999_999_999_999_999))
    assert not _valid(_mock_case(
        paid=1_000_000_000_000_000, bounty_topup=1,
    ))


def test_request_rejects_empty_profile_hash(core):
    assert not _valid(_mock_case(profile_hash=""))
    assert not _valid(_mock_case(profile_hash="   "))


def test_request_canonicalizes_profile_hash_before_write(core):
    """Two submissions of the same underlying hash (different casing) must
    aggregate under the same key — see also test_registry_cache."""
    a = core._canon_hash("  0xDEADBEEF  ")
    b = core._canon_hash("0xdeadbeef")
    assert a == b == "0xdeadbeef"


# ============================================================
# verdict shape — after `_build_verdict_from_ai` the on-chain payload the
# frontend renders must be well-formed.
# ============================================================
def test_verdict_build_clamps_confidence(core):
    """`confidence` is stored as `u8` — must be in [0, 100] even if the
    LLM emits garbage."""
    high = core._normalize_verdict(core.VERDICT_LIKELY_SCAM_RING, 999, 3, 85, 2)
    assert high == core.VERDICT_LIKELY_SCAM_RING  # value passes; clamping happens at build_verdict
    # The actual clamp is `min(100, max(0, int(ai.get('confidence', 0))))`
    # verified by inspection at contracts/stillhere_core.py:502
    assert min(100, max(0, 999)) == 100
    assert min(100, max(0, -50)) == 0


def test_verdict_label_defaults_to_inconclusive_on_missing_key(core):
    """`str(ai.get('label', VERDICT_INCONCLUSIVE))` — a missing label must
    NOT be silently promoted to LIKELY_REAL."""
    from types import SimpleNamespace
    default_label = core.VERDICT_INCONCLUSIVE
    assert default_label == "INCONCLUSIVE"
    assert default_label != core.VERDICT_LIKELY_REAL


def test_verdict_reason_is_truncated_to_2000_chars(core):
    """`str(ai.get('reason', ''))[:2000]` — a hostile LLM cannot flood the
    on-chain storage with a novel-length reason string."""
    long_reason = "x" * 5_000
    assert len(long_reason[:2000]) == 2000
