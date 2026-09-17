from fastapi.testclient import TestClient

from app.main import app
import app.users as users_module


client = TestClient(app)


def test_user_sync_requires_authentication() -> None:
    response = client.post("/api/v1/users/me/sync")
    assert response.status_code == 401


def test_user_sync_uses_verified_firebase_identity(monkeypatch) -> None:
    expected = {"id": "u1", "firebase_uid": "firebase-123", "display_name": "Chris"}

    monkeypatch.setattr(users_module, "require_auth", lambda: {"uid": "firebase-123", "name": "Chris"})
    monkeypatch.setattr(users_module, "upsert_user_from_firebase", lambda decoded: expected)

    response = client.post("/api/v1/users/me/sync")
    assert response.status_code == 200
    assert response.json() == {"user": expected}
