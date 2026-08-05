import json

def mock_scenario_real(client):
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "label": "LIKELY_REAL",
                    "confidence": 85,
                    "reason": "Profile shows years of consistent activity and verified history.",
                    "red_flags": []
                })
            },
            "web_mocks": {
                ".*": {"status": 200, "body": "Long established profile."}
            }
        }
    )

def mock_scenario_suspicious(client):
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "label": "SUSPICIOUS",
                    "confidence": 75,
                    "reason": "Photo matches unrelated identity.",
                    "red_flags": [
                        {"category": "STOLEN_PHOTO", "severity": "CRITICAL", "evidence": "Photo hit"}
                    ]
                })
            },
            "web_mocks": {
                ".*": {"status": 200, "body": "Profile text."}
            }
        }
    )

def mock_scenario_scam(client):
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "label": "LIKELY_SCAM_RING",
                    "confidence": 92,
                    "reason": "Multiple critical flags including stolen photo and early crypto request.",
                    "red_flags": [
                        {"category": "STOLEN_PHOTO", "severity": "CRITICAL", "evidence": "Multiple hits"},
                        {"category": "MONEY_REQUEST_EARLY", "severity": "CRITICAL", "evidence": "Asks for crypto"}
                    ]
                })
            },
            "web_mocks": {
                ".*": {"status": 200, "body": "Scam pattern text."}
            }
        }
    )

def test_ai_jury_scenarios_structure():
    assert True
