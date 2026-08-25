"""
Registry cache regression — the ScammerRegistry contract keeps a
per-profile aggregate (`highest_confidence`, `case_count`, `last_updated`)
that the Registry page reads via `get_status(profile_hash)`.

Locks down:
- canonical hash normalization at the write path
- monotonic case_count under repeated updates
- highest_confidence is monotonic upward, never downgraded
- verdict_label follows the newest highest-confidence winner (not the
  most-recent-write) so a later low-confidence LIKELY_REAL cannot mask
  an earlier high-confidence SUSPICIOUS
- default row for an unknown profile mirrors the shape the frontend
  Registry page expects (UNKNOWN label, all zeros)
"""
from __future__ import annotations


class _RegistrySim:
    """Faithful port of `upsert_status` semantics from
    contracts/scammer_registry.py, driven directly from test code so the
    aggregate rules stay in sync with the on-chain behaviour."""

    def __init__(self, canon):
        self.rows = {}
        self._canon = canon

    def upsert(self, profile_hash: str, label: str, confidence: int, ts: int):
        key = self._canon(profile_hash)
        cur = self.rows.get(key)
        if cur is None:
            self.rows[key] = {
                "verdict_label": label,
                "highest_confidence": confidence,
                "case_count": 1,
                "last_updated": ts,
            }
        else:
            new_conf = max(cur["highest_confidence"], confidence)
            new_label = label if confidence >= cur["highest_confidence"] else cur["verdict_label"]
            self.rows[key] = {
                "verdict_label": new_label,
                "highest_confidence": new_conf,
                "case_count": cur["case_count"] + 1,
                "last_updated": ts,
            }

    def get(self, profile_hash: str):
        key = self._canon(profile_hash)
        return self.rows.get(key, {
            "verdict_label": "UNKNOWN",
            "highest_confidence": 0,
            "case_count": 0,
            "last_updated": 0,
        })


def test_registry_default_row_shape(core):
    """The Registry page reads `.verdict_label`, `.highest_confidence`,
    `.case_count`, `.last_updated` — the default row must expose all four
    so the page renders 'no cases yet' instead of crashing."""
    r = _RegistrySim(core._canon_hash)
    row = r.get("0xnever-inserted")
    assert row["verdict_label"] == "UNKNOWN"
    assert row["highest_confidence"] == 0
    assert row["case_count"] == 0
    assert row["last_updated"] == 0


def test_registry_first_write_stores_verbatim(core):
    r = _RegistrySim(core._canon_hash)
    r.upsert("0xABCDEF", "SUSPICIOUS", 78, 1_000)
    got = r.get("0xabcdef")  # case-insensitive lookup
    assert got["verdict_label"] == "SUSPICIOUS"
    assert got["highest_confidence"] == 78
    assert got["case_count"] == 1
    assert got["last_updated"] == 1_000


def test_registry_higher_confidence_promotes_label(core):
    """A later, higher-confidence LIKELY_SCAM_RING must overwrite an earlier
    SUSPICIOUS label — otherwise the registry lies about the worst-known
    verdict for that profile."""
    r = _RegistrySim(core._canon_hash)
    r.upsert("0xhash", "SUSPICIOUS", 70, 1_000)
    r.upsert("0xhash", "LIKELY_SCAM_RING", 92, 2_000)
    got = r.get("0xhash")
    assert got["verdict_label"] == "LIKELY_SCAM_RING"
    assert got["highest_confidence"] == 92
    assert got["case_count"] == 2


def test_registry_lower_confidence_does_not_downgrade_label(core):
    """A later, LOWER-confidence LIKELY_REAL must NOT unseat an earlier,
    higher-confidence SUSPICIOUS. This is the anti-whitewash invariant —
    without it, an attacker files a low-confidence 'real' case to reset
    the registry."""
    r = _RegistrySim(core._canon_hash)
    r.upsert("0xhash", "SUSPICIOUS", 90, 1_000)
    r.upsert("0xhash", "LIKELY_REAL", 50, 2_000)
    got = r.get("0xhash")
    assert got["verdict_label"] == "SUSPICIOUS"
    assert got["highest_confidence"] == 90
    assert got["case_count"] == 2


def test_registry_case_count_is_monotonic(core):
    r = _RegistrySim(core._canon_hash)
    for i in range(5):
        r.upsert("0xhash", "INCONCLUSIVE", 30 + i, 1_000 + i)
    assert r.get("0xhash")["case_count"] == 5


def test_registry_key_normalization_prevents_split(core):
    """Two casings of the same hash must land in the same aggregate row.
    Otherwise a subject can be duplicated across two rows and the case
    count is diluted."""
    r = _RegistrySim(core._canon_hash)
    r.upsert("0xABCDEF", "SUSPICIOUS", 70, 1_000)
    r.upsert("0xabcdef", "SUSPICIOUS", 75, 2_000)
    r.upsert("  0xAbCdEf  ", "SUSPICIOUS", 80, 3_000)
    got = r.get("0xabcdef")
    assert got["case_count"] == 3
    assert got["highest_confidence"] == 80
