# Vibe

Vibe is a modern WhatsApp-style messaging web application built as a lightweight PWA.

## Current version

- Responsive chat interface for desktop and mobile
- Conversation list with search
- Chat view with sent/received bubbles
- Emoji and attachment controls
- Tabs for Discussions, Actus and Appels
- PWA manifest
- Firebase Authentication with Google, GitHub and email/password
- Firebase Realtime Database for real-time messaging, presence, reactions and events
- Private discussion membership with invitation codes
- Local demo mode when Firebase is unavailable

## Realtime Database architecture

```text
users/{uid}/settings/{name}
presence/{uid}/connections/{connectionId}
presence/{uid}/status
presence/{uid}/lastOnline

chats/{chatId}
chatMembers/{chatId}/{uid}
userChats/{uid}/{chatId}
joinRequests/{chatId}/{uid}
messages/{chatId}/{messageId}
typing/{chatId}/{uid}
reactions/{chatId}/{messageId}/{uid}
stories/{uid}/{storyId}
events/{uid}/{eventId}
calls/{callId}
incomingCalls/{uid}/{callId}
```

Realtime Database security rules are defined in `database.rules.json`. Access is granted according to the authenticated UID and, for private discussions, validated invitation membership. The rules are intentionally restrictive: the database root is not publicly readable or writable.

## Authentication

The web client uses Firebase Authentication. Available sign-in methods in the current interface are Google, GitHub and email/password. Authentication state is observed with Firebase's auth-state listener so the realtime subscriptions are started and stopped with the signed-in user.

## Run

This is a static web app. It can be served by GitHub Pages, Firebase Hosting, Render, or another static hosting provider. Firebase realtime features require the Vibe Firebase project configuration and the corresponding authentication providers to be enabled in Firebase Console.

The visual interface is intentionally kept separate from the Firebase data layer so realtime changes do not require changing the UI.
