"""
Phase 3 — Reputation, watcher, pause, analytics regression suite.

Focuses on deterministic helpers introduced in v0.10.0:
  * ``_trust_tier`` — Guardian / Trusted / Newcomer / Suspect / Unranked derivation
    from a ``RequesterStats`` snapshot.
  * ``_extract_host`` — content-aware URL-host extraction that feeds
    ``_corroboration_targets`` (multi-source AI upgrade).
  * ``_corroboration_targets`` — the 4-target public read-only corroboration set
    used by the AI Jury leader function.
  * ``_build_jury_prompt`` — corroboration block wiring, backwards-compat with
    the pre-v0.10 call sites that don't pass ``corroboration``.

The full on-chain contract path (upsert_status → verdict_counts / requester_stats
bump / bump_histogram cross-call) is exercised by the studionet integration test
after redeploy; those are covered by the existing gltest slow tier.
"""
from __future__ import annotations

from types import SimpleNamespace

from hypothesis import assume, given, strategies as st


# ---------------------------------------------------------------------------
# _trust_tier
# ---------------------------------------------------------------------------

def _stats(total, scam=0, real=0, inconclusive=0, failed=0, disputes=0):
    return SimpleNamespace(
        total_cases=total,
        scam_hits=scam,
        real_hits=real,
        inconclusive_hits=inconclusive,
        failed_cases=failed,
        disputes_filed=disputes,
        last_active=0,
    )


def test_trust_tier_unranked_when_no_cases(core):
    assert core._trust_tier(_stats(0)) == "UNRANKED"


def test_trust_tier_suspect_when_all_failed(core):
    # every case failed the jury — bad requester signal
    assert core._trust_tier(_stats(3, failed=3)) == "SUSPECT"


def test_trust_tier_guardian_gate(core):
    """>=10 cases AND >=30% scam-hit-rate → GUARDIAN."""
    # 10 cases, 3 scam → 30% exact, meets both gates
    assert core._trust_tier(_stats(10, scam=3)) == "GUARDIAN"
    # 10 cases, 2 scam → 20%, below GUARDIAN, above TRUSTED (needs 15%)
    assert core._trust_tier(_stats(10, scam=2)) == "TRUSTED"


def test_trust_tier_trusted_gate(core):
    """>=3 cases AND >=15% scam-hit-rate → TRUSTED (but below GUARDIAN)."""
    assert core._trust_tier(_stats(3, scam=1)) == "TRUSTED"


def test_trust_tier_newcomer_below_thresholds(core):
    """1 case, no scam hit → NEWCOMER (has activity, doesn't qualify higher)."""
    assert core._trust_tier(_stats(1, real=1)) == "NEWCOMER"


def test_trust_tier_never_regresses_from_all_scam(core):
    """A wallet with 100% scam hits over many cases must be at least TRUSTED."""
    assert core._trust_tier(_stats(20, scam=20)) == "GUARDIAN"


@given(
    total=st.integers(min_value=0, max_value=200),
    scam=st.integers(min_value=0, max_value=200),
    failed=st.integers(min_value=0, max_value=200),
)
def test_trust_tier_never_crashes(core, total, scam, failed):
    assume(scam <= total)
    assume(failed <= total)
    out = core._trust_tier(_stats(total, scam=scam, failed=failed))
    assert out in {"UNRANKED", "SUSPECT", "GUARDIAN", "TRUSTED", "NEWCOMER"}


# ---------------------------------------------------------------------------
# _extract_host
# ---------------------------------------------------------------------------

def test_extract_host_https(core):
    assert core._extract_host("https://Example.COM/some/path?x=1") == "example.com"


def test_extract_host_http(core):
    assert core._extract_host("http://sub.domain.org/foo") == "sub.domain.org"


def test_extract_host_rejects_non_url(core):
    assert core._extract_host("not-a-url") == ""
    assert core._extract_host("") == ""
    assert core._extract_host(None) == ""
    assert core._extract_host("ftp://x") == ""


def test_extract_host_preserves_port(core):
    assert core._extract_host("https://x.com:8443/y") == "x.com:8443"


@given(
    left=st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789", min_size=1, max_size=15),
    right=st.text(alphabet="abcdefghijklmnopqrstuvwxyz", min_size=2, max_size=6),
)
def test_extract_host_lowercase_round_trip(core, left, right):
    host = f"{left}.{right}"
    url = f"https://{host}/some/path"
    assert core._extract_host(url) == host.lower()


# ---------------------------------------------------------------------------
# _corroboration_targets — multi-source AI enhancement
# ---------------------------------------------------------------------------

def test_corroboration_empty_on_empty_input(core):
    assert core._corroboration_targets("") == []
    assert core._corroboration_targets("not-a-url") == []


def test_corroboration_returns_four_targets(core):
    ts = core._corroboration_targets("https://facebook.com/example")
    assert len(ts) == 4
    labels = {t["label"] for t in ts}
    assert labels == {"wayback", "urlscan", "google_cache", "duckduckgo"}


def test_corroboration_targets_are_read_only_https(core):
    ts = core._corroboration_targets("https://x.com/foo")
    for t in ts:
        assert t["url"].startswith("https://"), f"non-https corroboration target: {t}"
        # No target should point at a credential or auth endpoint
        low = t["url"].lower()
        assert "login" not in low
        assert "signin" not in low


def test_corroboration_urlscan_uses_host_not_full_url(core):
    """urlscan.io wants a domain, not a path — check the query includes only the host."""
    ts = core._corroboration_targets("https://facebook.com/some/user")
    urlscan = next(t for t in ts if t["label"] == "urlscan")
    assert "domain%3Afacebook.com" in urlscan["url"]
    assert "some/user" not in urlscan["url"]


# ---------------------------------------------------------------------------
# _build_jury_prompt — corroboration wiring + backwards-compat
# ---------------------------------------------------------------------------

def test_prompt_backwards_compatible_without_corroboration_kwarg(core):
    """Pre-Phase-3 callers that omit ``corroboration`` still receive a valid prompt."""
    prompt = core._build_jury_prompt(
        profile_texts=[{"url": "https://x", "text": "hi"}],
        image_hits=[],
        chat_sample="",
        contributor_texts=[],
        counter_texts=[],
        is_dispute_round=False,
        canary=core._canary_token(7, False),
    )
    assert "CORROBORATION" in prompt or "Corroboration" in prompt
    # empty list must still render, not crash
    assert "[]" in prompt


def test_prompt_embeds_corroboration_labels(core):
    cor = [
        {"label": "wayback", "url": "https://archive.org/wayback/available?url=https://x", "snippet": "no snapshot found"},
        {"label": "urlscan", "url": "https://urlscan.io/api/v1/search/?q=domain%3Ax.com", "snippet": "0 results"},
    ]
    prompt = core._build_jury_prompt(
        profile_texts=[{"url": "https://x", "text": "hi"}],
        image_hits=[],
        chat_sample="",
        contributor_texts=[],
        counter_texts=[],
        is_dispute_round=False,
        canary=core._canary_token(1, False),
        corroboration=cor,
    )
    assert "wayback" in prompt
    assert "urlscan" in prompt
    # The hardened rule 3 requires 2 independent sources for LIKELY_SCAM_RING
    assert "INDEPENDENT" in prompt or "independent" in prompt


def test_prompt_flags_zero_footprint_as_warning_not_critical(core):
    """The rule 6 addition prevents a single-source zero-footprint from
    solo-firing LIKELY_SCAM_RING. Must be present in the prompt text."""
    prompt = core._build_jury_prompt(
        profile_texts=[],
        image_hits=[],
        chat_sample="",
        contributor_texts=[],
        counter_texts=[],
        is_dispute_round=False,
        canary=core._canary_token(2, False),
        corroboration=[],
    )
    assert "NO_DIGITAL_FOOTPRINT" in prompt
    assert "WARNING" in prompt
