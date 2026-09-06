// Vibe Firebase configuration.
// Replace the placeholder values with your Firebase Web App config.
// Never commit private server credentials or service-account JSON here.
export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};

export const FIREBASE_ENABLED = !Object.values(firebaseConfig).some((value) => String(value).startsWith("YOUR_"));
