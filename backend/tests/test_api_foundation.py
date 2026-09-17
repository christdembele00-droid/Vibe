from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)

def test_health():
    response=client.get("/api/v1/health")
    assert response.status_code==200
    assert response.json()["status"]=="ok"

def test_auth_requires_bearer_token():
    response=client.get("/api/v1/auth/me")
    assert response.status_code==401

def test_media_signature_requires_auth():
    response=client.post("/api/v1/media/upload-signature")
    assert response.status_code==401
