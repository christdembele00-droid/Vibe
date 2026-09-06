# Vibe

Vibe is a WhatsApp-style messaging web application built as a lightweight PWA.

## Current version

- Responsive chat interface for desktop and mobile
- Conversation list with search
- Chat view with sent/received bubbles
- Emoji and attachment controls
- Tabs for Discussions, Actus and Appels
- PWA manifest
- Firebase configuration template
- Local demo mode when Firebase is not configured

## Firebase production layer

The frontend is prepared for Firebase Authentication, Cloud Firestore, Cloud Storage and Firebase Cloud Messaging. Add the Firebase Web App configuration in `firebase-config.js` (use environment/build-time secrets for production rather than committing sensitive credentials).

Recommended Firestore model:

```text
users/{uid}
  displayName
  photoURL
  lastSeen

conversations/{conversationId}
  participants: [uid]
  updatedAt

conversations/{conversationId}/messages/{messageId}
  senderId
  text
  type
  createdAt
  mediaUrl
  status
```

## Run

This is a static web app. It can be served by GitHub Pages or any static hosting provider. Firebase features require a configured Firebase Web App and Firestore/Auth rules.
