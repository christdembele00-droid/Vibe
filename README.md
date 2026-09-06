# VIBE

VIBE est une messagerie web temps réel construite autour de Firebase, avec interface OLED moderne, conversations privées, groupes existants, partage de médias, appels WebRTC, chaînes thématiques et assistant VIBE AI.

## Architecture

- `index.html` — shell unique de l'application et structure responsive.
- `style.css`, `vibe-actions.css`, `vibe-redesign.css`, `vibe-ui-cleanup.css`, `vibe-modern.css`, `vibe-oled.css` — couches de présentation, avec `vibe-oled.css` comme couche visuelle finale.
- `vibe-runtime.js` — contrôleur principal : Auth, utilisateurs, groupes existants, messages, médias, recherche et interactions.
- `vibe-persistence.js` — cache local Firestore persistant.
- `vibe-enhancements.js` — synchronisation avancée de recherche, non-lues et conversations Firestore.
- `vibe-actions.js` — profil, paramètres et actions intégrées à l'application ; la création de nouveaux groupes est désactivée.
- `calls.js` — gestion WebRTC des appels audio/vidéo individuels.
- `vibe-online.js` — présence et compteur d'utilisateurs en ligne.
- `vibe-local-notifications.js` — notifications locales pour les nouveaux messages.
- `vibe-channel.js` — chaînes VIBE et assistant VIBE AI intégré.
- `vibe-ai.js` — intégration Firebase AI Logic avec Gemini et Google Search grounding, avec recherche d'images Openverse pour les flux.
- `vibe-modern.js` — Command Palette `Ctrl/Cmd + K`.
- `vibe-analytics.js` — Analytics Firebase lorsqu'il est disponible.
- `vibe-seed.js` — initialisation des données de démonstration des chaînes.
- `firebase-config.js` — configuration publique Firebase et endpoint interne intercepté par VIBE AI.
- `firestore.rules` — contrôle d'accès Firestore.
- `storage.rules` — contrôle d'accès aux médias, taille maximale et types MIME.
- `manifest.webmanifest`, `sw.js`, `icons/icon.svg` — support PWA.
- `server.js`, `Dockerfile` — serveur statique optionnel pour Render ou un autre hébergeur.

## Fonctionnalités

- Authentification Google et GitHub via Firebase Authentication.
- Conversations privées et groupes existants en temps réel.
- Messages texte, images, vidéos, audio et documents.
- Modification, suppression pour tous et réactions aux messages.
- Recherche des utilisateurs et groupes.
- Présence en ligne et indicateur de frappe.
- Appels audio/vidéo WebRTC individuels avec échange ICE.
- Chaînes Actualités, Côte d'Ivoire, Monde, Sports, Technologie, Gaming, Musique, Divertissement, Science et VIBE AI.
- Flux de chaînes alimentés par VIBE AI avec recherche Web Google et images issues d'Openverse lorsqu'elles sont disponibles.
- Interface OLED, glassmorphism, glow, animations et Command Palette.
- Installation PWA et cache du shell de l'application.

## Firebase

Projet : `vibe-749e5`.

1. Active Google et GitHub dans Firebase Authentication.
2. Ajoute le domaine GitHub Pages dans les domaines autorisés Firebase Authentication.
3. Déploie `firestore.rules` et `storage.rules`.
4. Le frontend utilise Firebase AI Logic avec le backend Gemini Developer API ; aucun secret Gemini privé n'est placé dans `firebase-config.js`.

La configuration Firebase Web présente dans le frontend est une configuration publique. Les secrets privés et comptes de service ne doivent jamais être ajoutés au dépôt.

## Sécurité

- Les conversations Firestore sont limitées aux participants.
- Les messages sont validés par les règles Firestore.
- Les médias sont écrits sous `chat-media/{roomId}/{uid}/...` et Storage vérifie le propriétaire.
- Storage limite les fichiers à 25 Mo et les types MIME autorisés.
- Les candidats WebRTC sont accessibles uniquement aux deux participants de l'appel.
- Les utilisateurs ne peuvent modifier ou supprimer que leurs propres publications de chaîne ou leurs propres messages selon les règles correspondantes.

## Développement

Un serveur HTTP local est recommandé pour tester les modules ES, le service worker et WebRTC. GitHub Pages sert directement le frontend.

## Validation

Le workflow `Validate VIBE` vérifie automatiquement :

- la syntaxe de tous les fichiers JavaScript ;
- les fichiers JSON ;
- les références des fichiers chargés par `index.html` ;
- les ressources nécessaires au cache PWA.

Le workflow `Deploy Firebase Rules` déploie uniquement les règles Firestore et Storage.

## Limites actuelles

- Les appels de groupe ne sont pas encore activés.
- La recherche globale de messages reste limitée aux conversations chargées ; Firestore n'est pas un moteur full-text.
- Pour une robustesse WebRTC maximale sur les réseaux restrictifs, un serveur TURN de production doit être ajouté.
- Les chaînes thématiques peuvent accepter des publications d'utilisateurs authentifiés ; un véritable mode diffusion réservé à un administrateur nécessiterait une politique d'administration dédiée.
