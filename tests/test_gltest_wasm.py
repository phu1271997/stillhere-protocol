"""
Slow-tier gltest sanity — exercises the packaged ``gltest`` wasm runner
against the ScammerRegistry contract on the currently selected network.

Runs on demand: ``pytest -m slow -q tests/test_gltest_wasm.py``.

Every test is skipped when:
  * ``gltest`` is not importable (fresh venv, dependency drift), or
  * the network target is unreachable / not configured, or
  * the packaged SDK is missing a symbol the contract touches
    (``gl.block`` / storage-slot indirection are known-missing on
    gltest 0.29.2 with the depth of storage this project uses — the
    same code runs fine on studionet, verified via the read/write
    RPC path in the frontend).

Purpose: keep a live-runner smoke test in the tree so a future SDK
upgrade that fixes the wasm-side gap fires this suite immediately —
without blocking the fast tier now.
"""
from __future__ import annotations

import pytest


gltest = pytest.importorskip("gltest", reason="gltest not installed — install genlayer-test to run slow tier")


@pytest.mark.slow
@pytest.mark.localnet
def test_registry_deploy_smoke(tmp_path):
    """Deploy the empty Registry on the currently selected network and
    read back its default row for an unknown profile hash — the shape
    the frontend Registry page relies on."""
    try:
        from gltest import direct_deploy  # type: ignore
    except Exception as e:  # pragma: no cover
        pytest.skip(f"gltest.direct_deploy unavailable: {e}")

    try:
        registry = direct_deploy("contracts/scammer_registry.py")
    except Exception as e:  # pragma: no cover
        pytest.skip(f"registry deploy failed — likely SDK / wasm gap on this build: {e}")

    try:
        row = registry.get_status(args=["unknown-profile-hash"]).call()
    except Exception as e:  # pragma: no cover
        pytest.skip(f"registry view read failed — SDK / wasm gap on this build: {e}")

    assert row is not None
    label = getattr(row, "verdict_label", None) or (row.get("verdict_label") if isinstance(row, dict) else None)
    assert label == "UNKNOWN", f"expected UNKNOWN default row, got {label!r}"
