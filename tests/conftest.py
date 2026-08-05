import sys
import pytest

def clear_known_contracts():
    for name, module in list(sys.modules.items()):
        if "genlayer" in name and hasattr(module, "__known_contract__"):
            setattr(module, "__known_contract__", None)

@pytest.fixture(autouse=True)
def _reset_contracts():
    clear_known_contracts()
    yield
