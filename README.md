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
- Firebase Firestore for messaging, presence, reactions, stories and call signaling
- Private discussion membership with invitation codes
- Local demo mode when Firebase is unavailable

## Firebase architecture

Vibe uses Cloud Firestore as its application database. The Firestore security rules are defined in `firestore.rules`.

The web client uses Firebase Authentication. Available sign-in methods are Google, GitHub and email/password. Authentication state controls the application's realtime subscriptions.

## Run

This is a static web app. It can be served by GitHub Pages, Firebase Hosting, Render, or another static hosting provider. Firebase features require the Vibe Firebase project configuration and the corresponding authentication providers to be enabled in Firebase Console.

The visual interface is intentionally kept separate from the Firebase data layer so realtime changes do not require changing the UI.
