"""
CaseAnnotations helper-level regression suite.

The contract's stateful methods depend on ``self.annotations`` /
``self.author_index`` / ``self.last_post_ts`` etc. TreeMap storage,
which is only wired up when gltest boots a real contract instance -
the packaged gltest wasm loader still lacks ``gl.block`` at the depth
this contract uses, so the ``fast`` tier can only exercise the
module-level helpers + the category enum. The on-chain state machine
is exercised by studionet integration after redeploy.
"""
from __future__ import annotations

from hypothesis import given, strategies as st


# ---------------------------------------------------------------------------
# _canon (address + hash canonicalization shared with core / registry)
# ---------------------------------------------------------------------------

def test_canon_lowercases(annotations):
    assert annotations._canon("  ABC  ") == "abc"
    assert annotations._canon("0xDEAD") == "0xdead"


def test_canon_handles_none_and_empty(annotations):
    assert annotations._canon(None) == ""
    assert annotations._canon("") == ""
    assert annotations._canon("   ") == ""


@given(st.text())
def test_canon_idempotent(annotations, s):
    once = annotations._canon(s)
    twice = annotations._canon(once)
    assert once == twice


# ---------------------------------------------------------------------------
# Category enum shape
# ---------------------------------------------------------------------------

def test_five_categories_defined(annotations):
    assert set(annotations._ALLOWED_CATEGORIES) == {
        "WITNESS", "INHERITED_PATTERN", "COUNTER_CONTEXT",
        "CORROBORATE", "SAFETY_TIP",
    }


def test_category_constants_match_allowed(annotations):
    """Every named CAT_* constant must appear in _ALLOWED_CATEGORIES."""
    cats = {
        annotations.CAT_WITNESS,
        annotations.CAT_INHERITED,
        annotations.CAT_COUNTER,
        annotations.CAT_CORROBORATE,
        annotations.CAT_SAFETY_TIP,
    }
    assert cats == set(annotations._ALLOWED_CATEGORIES)


def test_categories_are_stable_strings(annotations):
    """Renaming a category is a breaking on-chain change - lock the exact
    strings so any drift is caught at CI time, not after deploy."""
    assert annotations.CAT_WITNESS == "WITNESS"
    assert annotations.CAT_INHERITED == "INHERITED_PATTERN"
    assert annotations.CAT_COUNTER == "COUNTER_CONTEXT"
    assert annotations.CAT_CORROBORATE == "CORROBORATE"
    assert annotations.CAT_SAFETY_TIP == "SAFETY_TIP"


# ---------------------------------------------------------------------------
# Bounds
# ---------------------------------------------------------------------------

def test_body_hash_bounds_are_sane(annotations):
    """A keccak256 hex is 66 chars (0x + 64). Bounds must let it through."""
    assert annotations.MIN_BODY_HASH_LEN <= 4
    assert annotations.MAX_BODY_HASH_LEN >= 66


def test_url_length_bound_matches_core(annotations):
    """MAX_URL_LEN of 512 matches the value used in stillhere_core's
    contribute_evidence guard. Divergence would let one contract accept a
    URL the other rejects."""
    assert annotations.MAX_URL_LEN == 512


def test_default_cooldown_positive(annotations):
    assert annotations.DEFAULT_COOLDOWN_SECS > 0


# ---------------------------------------------------------------------------
# Address helpers
# ---------------------------------------------------------------------------

def test_to_address_from_hex_string(annotations):
    a = annotations._to_address("0x" + "1" * 40)
    assert annotations._addr_str(a) == "0x" + "1" * 40


def test_addr_str_lowercases(annotations):
    a = annotations._to_address("0x" + "A" * 40)
    assert annotations._addr_str(a) == "0x" + "a" * 40
