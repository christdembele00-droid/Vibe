# Vibe

Vibe is a modern WhatsApp-style messaging web application built as a lightweight PWA.

## Current version

- Responsive chat interface for desktop and mobile
- Conversation list with search
- Chat view with sent/received bubbles
- Emoji and attachment controls
- Tabs for Discussions, Actus and Appels
- PWA manifest
- Firebase Authentication
- Firebase Realtime Database for real-time messaging, presence and typing state
- Local demo mode when Firebase is unavailable

## Realtime Database architecture

```text
presence/{uid}/connections/{connectionId}
presence/{uid}/status
presence/{uid}/lastOnline

chatMembers/{chatId}/{uid}
messages/{chatId}/{messageId}
typing/{chatId}/{uid}
events/{uid}/{eventId}
```

Realtime Database security rules are defined in `database.rules.json` and use the authenticated user's UID to restrict access to presence, chat membership, messages, typing state and user events.

## Run

This is a static web app. It can be served by GitHub Pages, Firebase Hosting, Render, or another static hosting provider. Firebase real-time features require the VIBE Web Firebase configuration and enabled Anonymous Authentication.

The visual interface is intentionally kept separate from the Firebase data layer so realtime changes do not require changing the UI.
