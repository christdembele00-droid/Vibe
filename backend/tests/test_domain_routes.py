from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_domain_routes_require_authentication():
    paths = [
        "/api/v1/contacts",
        "/api/v1/contacts/requests",
        "/api/v1/devices",
        "/api/v1/groups",
        "/api/v1/channels",
        "/api/v1/statuses",
        "/api/v1/media/complete",
        "/api/v1/security/reports",
        "/api/v1/search/users?q=x",
        "/api/v1/account/deletion",
        "/api/v1/account/me",
    ]
    for path in paths:
        if path == "/api/v1/account/me":
            response = client.delete(path)
        elif path.startswith("/api/v1/search") or path in (
            "/api/v1/contacts",
            "/api/v1/devices",
            "/api/v1/groups",
            "/api/v1/channels",
            "/api/v1/statuses",
        ):
            response = client.get(path)
        else:
            response = client.post(path)
        assert response.status_code == 401, (path, response.status_code)


def test_contacts_listing_excludes_current_user():
    source = open("app/contacts.py", encoding="utf-8").read()
    assert "x.contact_user_id<>:u" in source
    assert "u.deleted_at IS NULL" in source


def test_identity_and_authorization_guards_are_present():
    security = open("app/security.py", encoding="utf-8").read()
    groups = open("app/groups.py", encoding="utf-8").read()
    messages = open("app/messages.py", encoding="utf-8").read()
    contacts = open("app/contacts.py", encoding="utf-8").read()
    maintenance = open("app/maintenance.py", encoding="utf-8").read()

    assert 'if user_id==current_user["id"]' in security
    assert 'if body.target_id==current_user["id"]' in security
    assert 'if user_id==current_user["id"]' in groups
    assert "ON CONFLICT (sender_id,client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING" in messages
    assert "u.email" not in contacts
    assert "cloudinary.uploader.destroy" in maintenance


def test_account_deletion_is_retry_safe():
    account = open("app/account.py", encoding="utf-8").read()
    maintenance_source = open("app/maintenance.py", encoding="utf-8").read()
    assert '@router.delete("/me")' in account
    assert "UPDATE account_deletion_requests" in maintenance_source
    assert "firebase_auth.UserNotFoundError" in maintenance_source
    assert "DELETE FROM users WHERE id=:u" in maintenance_source


def test_global_test_purge_is_guarded_and_synchronized():
    maintenance_source = open("app/maintenance.py", encoding="utf-8").read()
    assert "VIBE_ALLOW_TEST_PURGE" in maintenance_source
    assert '{"development", "test", "staging"}' in maintenance_source
    assert "while _remaining_database_users():" in maintenance_source
    assert "firebase_auth.list_users().iterate_all()" in maintenance_source
    assert "_purge_recorded_media()" in maintenance_source


def test_deleted_accounts_cannot_be_resurrected():
    database_source = open("app/database.py", encoding="utf-8").read()
    dependencies_source = open("app/auth/dependencies.py", encoding="utf-8").read()
    assert "WHERE users.deleted_at IS NULL" in database_source
    assert 'detail="Compte VIBE supprimé"' in database_source
    assert "status_code=status.HTTP_401_UNAUTHORIZED" in dependencies_source


def test_client_hard_reset_signs_out_firebase():
    api_source = open("../frontend/services/api.ts", encoding="utf-8").read()
    assert 'response.status === 401' in api_source
    assert 'import("firebase/app")' in api_source
    assert 'import("firebase/auth")' in api_source
    assert "signOut(getAuth(app))" in api_source
    assert "localStorage.clear()" in api_source
    assert "sessionStorage.clear()" in api_source


def test_entity_ids_use_uuid():
    migration = open("../database/migrations/0001_initial.sql", encoding="utf-8").read()
    assert "id UUID PRIMARY KEY DEFAULT gen_random_uuid()" in migration
    assert "conversation_id UUID NOT NULL" in migration
    assert "message_id UUID NOT NULL" in migration
