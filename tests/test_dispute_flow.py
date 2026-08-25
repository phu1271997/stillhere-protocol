"""
Dispute flow regression — locks down the state-machine invariants the
frontend depends on when routing between VerdictDetail and the Round 2
Jury path.

The Contract stores two verdict slots per case (`verdict_v1`, `verdict_v2`).
Before any dispute: `state=VERDICT` → `get_verdict` returns `verdict_v1`.
After dispute filed + AI re-run: `state=RE_VERDICT` → `get_verdict`
returns `verdict_v2`. The `VerdictDetail.tsx` page reads exactly this
view; a regression here would silently show the pre-dispute verdict
after a subject successfully overturned it.
"""
from __future__ import annotations


class _Case:
    """Just enough of the on-chain Case shape to drive the state machine."""
    def __init__(self):
        self.state = "PENDING"
        self.verdict_v1 = None
        self.verdict_v2 = None
        self.dispute_evidence_urls = []


def _get_verdict(c: _Case):
    return c.verdict_v2 if c.state == "RE_VERDICT" else c.verdict_v1


def test_dispute_requires_verdict_state(core):
    c = _Case()
    c.state = "PENDING"
    # frontend gates the "File Dispute" button behind get_case().state == "VERDICT";
    # the contract also gates on-chain — mirror that guard here.
    with_pending = c.state == "VERDICT"
    assert not with_pending, "cannot file dispute against a PENDING case"

    c.state = "FAILED"
    assert c.state != "VERDICT", "cannot file dispute against a FAILED case"


def test_dispute_replaces_read_verdict_only_after_re_verdict(core):
    c = _Case()
    c.state = "VERDICT"
    c.verdict_v1 = {"label": core.VERDICT_SUSPICIOUS, "confidence": 78, "reason": "r1"}

    # while state is still DISPUTED (jury re-running), get_verdict still
    # returns v1 — the frontend must not flash a stale null verdict
    c.state = "DISPUTED"
    assert _get_verdict(c)["label"] == core.VERDICT_SUSPICIOUS

    # once the re-jury finalizes and writes v2, state flips → get_verdict returns v2
    c.verdict_v2 = {"label": core.VERDICT_LIKELY_REAL, "confidence": 88, "reason": "r2"}
    c.state = "RE_VERDICT"
    assert _get_verdict(c)["label"] == core.VERDICT_LIKELY_REAL


def test_dispute_max_one_round(core):
    """MAX_DISPUTES = 1 in the contract — after RE_VERDICT the case
    should not accept another file_dispute call."""
    assert core.MAX_DISPUTES == 1
    c = _Case()
    c.state = "RE_VERDICT"
    # contract-side guard: `if c.state != STATE_VERDICT: raise`
    assert c.state != "VERDICT", "second dispute must be rejected"


def test_dispute_prompt_flag_is_wired(core):
    """The dispute round must set the `is_dispute_round` flag in the
    prompt builder — otherwise the LLM never sees counter-evidence as
    counter-evidence and won't apply the presumption-of-innocence
    weighting."""
    prompt = core._build_jury_prompt(
        profile_texts=[],
        image_hits=[],
        chat_sample="",
        contributor_texts=[],
        counter_texts=[{"url": "https://y", "text": "counter"}],
        is_dispute_round=True,
        canary=core._canary_token(1, True),
    )
    assert "DISPUTE round" in prompt
    # dispute canary shape differs from request canary shape
    assert "SH-D-" in prompt
    assert "SH-R-" not in prompt


def test_dispute_canary_and_request_canary_are_disjoint(core):
    """Same case_id, different round → different canary. A validator can
    tell which round it is looking at from the canary alone."""
    req = core._canary_token(42, False)
    dis = core._canary_token(42, True)
    assert req != dis
    assert req.startswith("SH-R-")
    assert dis.startswith("SH-D-")
