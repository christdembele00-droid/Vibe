# CAHIER DES CHARGES — VIBE
Version: stabilisation prioritaire

## 1. Objectif
VIBE doit être une messagerie réellement utilisable sur Web et Android avant toute extension fonctionnelle.

## 2. Priorités
1. Démarrage sans blocage.
2. Authentification fiable.
3. Navigation et interface sans clics morts.
4. Conversations et messages fiables.
5. Temps réel fiable.
6. Médias fiables.
7. Notifications fiables.
8. Groupes, statuts et chaînes sans régression.
9. Appels fonctionnels.
10. IA intégrée sans empêcher la messagerie.
11. Sécurité et protection des données.
12. Tests et build reproductible.

## 3. Règle de développement
Aucune nouvelle fonctionnalité importante ne doit être ajoutée tant qu'elle introduit ou laisse une régression sur le parcours critique.

## 4. Parcours critique obligatoire
Connexion → liste des conversations → ouverture d'une conversation → envoi d'un texte → réception temps réel → rechargement → déconnexion → reconnexion.

Puis: image → vidéo → notification → groupe → appel → IA.

## 5. Web
Le frontend doit démarrer proprement, ne pas rester bloqué par une API indisponible et afficher une erreur exploitable. En local, l'API utilise par défaut http://localhost:8000/api/v1. En production, NEXT_PUBLIC_API_URL doit être fourni par l'environnement de build.

## 6. Android
Package: com.vibe.app.
Le build doit produire un AAB release et un APK de test. Google Sign-In doit fonctionner avec la configuration Firebase et le certificat réellement utilisé.

## 7. Backend
FastAPI doit répondre au healthcheck, valider les entrées, authentifier les requêtes, vérifier les appartenances aux conversations et ne jamais exposer de secrets.

## 8. Base de données
Les migrations doivent être reproductibles. Les requêtes critiques doivent être transactionnelles et ne doivent pas utiliser une connexion SQL déjà fermée.

## 9. Temps réel
Une seule connexion WebSocket par conversation active, reconnexion contrôlée, nettoyage à la fermeture, et aucun événement ne doit provoquer un crash du client.

## 10. Médias
Cloudinary est utilisé pour les uploads. Les types et tailles sont contrôlés. Le backend vérifie que le média appartient à l'utilisateur avant association à un message.

## 11. Notifications
FCM doit enregistrer les appareils, gérer les tokens invalides et ouvrir la bonne conversation.

## 12. Sécurité
Aucun secret serveur dans le frontend. Les autorisations sont vérifiées côté backend. Les tokens ne sont jamais écrits dans les logs.

## 13. Qualité
Chaque correction importante doit avoir au minimum un test ou une vérification reproductible. Les erreurs 401, réseau, WebSocket, Firebase, Cloudinary et WebRTC doivent être diagnostiquables.

## 14. Critère de sortie
VIBE est considéré stabilisé lorsque le parcours critique fonctionne sur navigateur et appareil Android réel, sans erreur critique connue, avec build frontend et Android réussis.
