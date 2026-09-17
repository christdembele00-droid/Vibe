from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)

def test_domain_routes_require_authentication():
    paths=['/api/v1/contacts','/api/v1/contacts/requests','/api/v1/devices','/api/v1/groups','/api/v1/channels','/api/v1/statuses','/api/v1/media/complete','/api/v1/security/reports','/api/v1/search/users?q=x','/api/v1/account/deletion']
    for path in paths:
        response=client.get(path) if path.startswith('/api/v1/search') or path in ('/api/v1/contacts','/api/v1/devices','/api/v1/groups','/api/v1/channels','/api/v1/statuses') else client.post(path)
        assert response.status_code == 401, (path,response.status_code)


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
    assert 'ON CONFLICT (sender_id,client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING' in messages
    assert "u.email" not in contacts
    assert 'cloudinary.uploader.destroy' in maintenance
