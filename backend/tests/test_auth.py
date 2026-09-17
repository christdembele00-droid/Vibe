from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_protected_endpoint_requires_bearer_token() -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_protected_endpoint_rejects_empty_bearer_token() -> None:
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer "})
    assert response.status_code == 401
