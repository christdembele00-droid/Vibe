from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)

def test_protected_conversation_requires_auth():
    response=client.get('/api/v1/conversations')
    assert response.status_code==401

def test_protected_message_requires_auth():
    response=client.get('/api/v1/conversations/00000000-0000-0000-0000-000000000000/messages')
    assert response.status_code==401
