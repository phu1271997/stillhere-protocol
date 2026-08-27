"""
Shared test setup for StillHere.

Two responsibilities:

1. `clear_known_contracts` — reset the GenVM per-module singleton before each
   test so back-to-back `direct_deploy(...)` calls don't crash with
   "only one contract is allowed".

2. `_install_genlayer_stub` + the `core` / `registry` fixtures — import the
   real contract source (`contracts/*.py`) with a minimal `genlayer` stub in
   `sys.modules`, so deterministic helpers (`_normalize_verdict`,
   `_extract_json`, `_canary_token`, prompt builder, ...) can be exercised
   without the gltest wasm loader. Packaged `gltest` v0.29.2 is missing
   `gl.block` / storage-slot indirection at the depth these contracts use,
   so the on-chain path is not reachable from CI — but the deterministic
   helpers are the highest-value branches to lock down with regressions
   anyway (E4 boundary, canary shape, validator semantics).
"""
from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parent.parent
CORE_PATH = ROOT / "contracts" / "stillhere_core.py"
REGISTRY_PATH = ROOT / "contracts" / "scammer_registry.py"


def clear_known_contracts():
    for name, module in list(sys.modules.items()):
        if "genlayer" in name and hasattr(module, "__known_contract__"):
            setattr(module, "__known_contract__", None)


@pytest.fixture(autouse=True)
def _reset_contracts():
    clear_known_contracts()
    yield


def pytest_collection_modifyitems(config, items):
    """Auto-mark every test as ``fast`` unless it explicitly carries ``slow`` /
    ``studionet`` / ``localnet``. Lets ``-m fast`` and ``-m slow`` select
    tiers without a per-test decorator dance."""
    tier_markers = {"slow", "studionet", "localnet"}
    for item in items:
        own = {m.name for m in item.iter_markers()}
        if not own & tier_markers:
            item.add_marker(pytest.mark.fast)


def _install_genlayer_stub() -> None:
    if "genlayer" in sys.modules and getattr(sys.modules["genlayer"], "_stillhere_stub", False):
        return

    genlayer = types.ModuleType("genlayer")
    genlayer._stillhere_stub = True

    class _AnyGeneric:
        def __class_getitem__(cls, _item):
            return cls

    class DynArray(_AnyGeneric):
        pass

    class TreeMap(_AnyGeneric):
        pass

    class Address:
        def __init__(self, val):
            if isinstance(val, Address):
                self._hex = val._hex
                return
            if isinstance(val, (bytes, bytearray)):
                self._hex = "0x" + bytes(val).hex()
                return
            s = str(val)
            self._hex = s if s.startswith("0x") else "0x" + s

        @property
        def as_hex(self) -> str:
            return self._hex

        def __str__(self) -> str:
            return self._hex

        def __eq__(self, other) -> bool:
            return isinstance(other, Address) and other._hex.lower() == self._hex.lower()

        def __hash__(self) -> int:
            return hash(self._hex.lower())

    def _sized_int_factory(_name):
        def _make(x):
            return int(x)
        return _make

    class _GLContract:
        pass

    class _GLVMUserError(Exception):
        pass

    class _GLVMReturn:
        def __init__(self, calldata):
            self.calldata = calldata

    class _Storage:
        @staticmethod
        def inmem_allocate(_T, *args, **kwargs):
            return [] if _T is DynArray or getattr(_T, "__origin__", None) is DynArray else {}

    class _Nondet:
        class web:
            @staticmethod
            def render(url, mode="text"):
                return f"MOCK<{url}>"

            @staticmethod
            def get(url):
                return f"MOCK<{url}>"

        @staticmethod
        def exec_prompt(prompt, response_format=None):
            return '{"canary":"STUB","label":"INCONCLUSIVE","confidence":0,"reason":"stub","red_flags":[]}'

    class _VM:
        Return = _GLVMReturn
        UserError = _GLVMUserError

        @staticmethod
        def run_nondet(leader_fn, validator_fn):
            return leader_fn()

    class _Message:
        sender_address = Address("0x" + "1" * 40)
        value = 0

    class _Block:
        timestamp = 1_700_000_000

    class _EqPrinciple:
        @staticmethod
        def strict_eq(fn):
            return fn()

    class _Public:
        class write:
            @staticmethod
            def __call__(fn):
                return fn

            def __new__(cls, fn=None):
                return fn if fn is not None else cls

            class payable:
                def __new__(cls, fn):
                    return fn

        class view:
            def __new__(cls, fn):
                return fn

    class _GL:
        Contract = _GLContract
        vm = _VM()
        nondet = _Nondet()
        message = _Message()
        block = _Block()
        eq_principle = _EqPrinciple()
        storage = _Storage()
        public = _Public

        @staticmethod
        def contract_interface(cls):
            return cls

        @staticmethod
        def get_contract_at(_addr):
            class _Iface:
                def as_interface(self, _cls):
                    return self

                def __getattr__(self, _name):
                    def _noop(*a, **k):
                        return None
                    return _noop
            return _Iface()

    genlayer.gl = _GL()
    genlayer.Address = Address
    genlayer.DynArray = DynArray
    genlayer.TreeMap = TreeMap
    genlayer.bigint = int
    genlayer.u8 = _sized_int_factory("u8")
    genlayer.u16 = _sized_int_factory("u16")
    genlayer.u32 = _sized_int_factory("u32")
    genlayer.u256 = _sized_int_factory("u256")
    genlayer.i256 = _sized_int_factory("i256")
    genlayer.allow_storage = lambda cls: cls

    sys.modules["genlayer"] = genlayer


def _import_module(path: Path, name: str) -> types.ModuleType:
    _install_genlayer_stub()
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def core():
    return _import_module(CORE_PATH, "_stillhere_core_under_test")


@pytest.fixture(scope="session")
def registry():
    return _import_module(REGISTRY_PATH, "_stillhere_registry_under_test")
