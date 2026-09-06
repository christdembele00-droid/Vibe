import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

try {
  initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager()
    })
  });
} catch (error) {
  // Another module may already have initialized Firestore. The application
  // continues normally with the default Firestore cache in that case.
  if (!['failed-precondition', 'already-exists'].includes(error?.code)) {
    console.warn('VIBE Firestore persistence:', error);
  }
}
