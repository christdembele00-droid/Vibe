from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)

def test_domain_routes_require_authentication():
    paths=['/api/v1/contacts','/api/v1/contacts/requests','/api/v1/devices','/api/v1/groups','/api/v1/channels','/api/v1/statuses','/api/v1/media/complete','/api/v1/security/reports','/api/v1/search/users?q=x','/api/v1/account/deletion']
    for path in paths:
        response=client.get(path) if path.startswith('/api/v1/search') or path in ('/api/v1/contacts','/api/v1/devices','/api/v1/groups','/api/v1/channels','/api/v1/statuses') else client.post(path)
        assert response.status_code == 401, (path,response.status_code)
