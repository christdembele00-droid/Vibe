# VIBE

VIBE est une messagerie web temps réel construite autour de Firebase, avec une interface responsive, groupes, statuts, partage de médias, appels WebRTC et assistant VIBE AI.

## Architecture

- `index.html` — shell unique de l'application et structure responsive.
- `style.css` — design system unique : desktop, tablette, mobile et mode sombre.
- `vibe-runtime.js` — contrôleur frontend unique : Auth, utilisateurs, groupes, messages, médias, statuts, recherche, profil, paramètres et interactions.
- `calls.js` — gestion WebRTC unique : appel entrant/sortant, ICE bidirectionnel, états et nettoyage.
- `firebase-config.js` — configuration publique Firebase et URL de la Cloud Function IA.
- `functions/index.js` — API Gemini sécurisée côté serveur et annuaire VIBE.
- `firestore.rules` — contrôle d'accès Firestore.
- `storage.rules` — contrôle d'accès aux médias, taille maximale et types MIME.
- `manifest.webmanifest`, `sw.js`, `icons/icon.svg` — support PWA.

## Fonctionnalités

- Authentification Google et GitHub via Firebase Authentication.
- Conversations privées et groupes.
- Messages texte, images, vidéos, audio et documents.
- Modification, suppression pour tous et réactions aux messages.
- Statuts persistants Firebase avec expiration à 24 h.
- Recherche des utilisateurs/groupes et recherche dans les messages chargés d'une conversation.
- Présence en ligne et indicateur de frappe.
- Appels audio/vidéo WebRTC avec échange ICE dans les deux sens.
- VIBE AI via Cloud Function Gemini avec authentification Firebase et limitation de 12 requêtes/minute/utilisateur.
- Interface responsive pensée pour grands écrans et mobiles.
- Installation PWA et cache du shell de l'application.

## Firebase

1. Crée ou utilise le projet Firebase `vibe-749e5`.
2. Active Google et GitHub dans Authentication.
3. Ajoute le domaine GitHub Pages dans les domaines autorisés Firebase Authentication.
4. Déploie Firestore et Storage Rules.
5. Configure le secret `GEMINI_API_KEY` pour Cloud Functions.
6. Déploie `functions/`.

La clé Gemini ne doit jamais être placée dans le frontend.

## Sécurité

- Les appels IA exigent un Firebase ID token.
- Les clés Gemini restent dans Firebase Secret Manager.
- Les médias exigent que l'utilisateur appartienne à la conversation.
- Chaque média est maintenant écrit sous `chat-media/{roomId}/{uid}/...` et Storage vérifie que le dossier propriétaire correspond à l'utilisateur authentifié.
- Storage limite les fichiers à 25 Mo et autorise uniquement les types nécessaires à VIBE.
- Les candidats WebRTC sont accessibles uniquement aux deux participants de l'appel.

## Développement

Un serveur HTTP local est recommandé pour tester les modules ES, le service worker et WebRTC. Par exemple, utilise l'extension Live Server de VS Code ou un serveur statique local.

## Déploiement

Le frontend peut être servi par GitHub Pages. Les fonctions Firebase sont déployées depuis `functions/` avec Firebase CLI.

## Limites actuelles

- Les appels de groupe ne sont pas encore activés.
- La recherche globale de messages reste limitée aux messages chargés d'une conversation ; Firestore n'est pas un moteur full-text.
- Pour une robustesse WebRTC maximale sur les réseaux restrictifs, un serveur TURN de production doit être ajouté.
