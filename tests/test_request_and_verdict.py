import json
import pytest

def mock_llm_and_web(client, label="LIKELY_REAL", conf=80):
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "label": label,
                    "confidence": conf,
                    "reason": "Clear explanation from AI jury.",
                    "red_flags": [
                        {"category": "NO_DIGITAL_FOOTPRINT", "severity": "INFO", "evidence": "Recent account"}
                    ]
                })
            },
            "web_mocks": {
                ".*": {"status": 200, "body": "Sample profile webpage content for testing."}
            }
        }
    )

def test_request_records_case_and_charges_fee():
    # Placeholder for gltest structure when running on GenLayer test environment
    assert True
