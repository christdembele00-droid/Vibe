# VIBE — Inventaire fichier par fichier

**Branche :** `main`  
**HEAD :** `1ae9277adbc2f9d91f2b7a016f1d9f555a002721`  
**Date :** 18 septembre 2026  
**Nombre de fichiers suivis :** 109

## Résultat

| Catégorie | Nombre |
|---|---:|
| UTILISÉ | 39 |
| NÉCESSAIRE | 30 |
| DOUBLON | 0 |
| OBSOLÈTE | 0 |
| À CONSERVER TEMPORAIREMENT | 40 |

**Hébergement :** Render et Railway ne font plus partie du dépôt. Le frontend public est publié par GitHub Pages ; Vercel reste disponible comme hébergement Next.js. `vibe-media-render.js` est un renderer média et ne correspond pas à Render.com.

## Inventaire complet

| # | Fichier | Taille | Classement | Justification |
|---:|---|---:|---|---|
| 1 | .dockerignore | 120 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 2 | .env.example | 487 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 3 | .github/workflows/android.yml | 3071 | UTILISÉ | Workflow actif de publication ou de validation CI. |
| 4 | .github/workflows/backend.yml | 2142 | UTILISÉ | Workflow actif de publication ou de validation CI. |
| 5 | .github/workflows/build-android.yml | 6663 | UTILISÉ | Workflow actif de publication ou de validation CI. |
| 6 | .github/workflows/deploy-firestore-rules.yml | 1313 | À CONSERVER TEMPORAIREMENT | Ancienne automatisation Firestore conservée jusqu'à migration complète. |
| 7 | .github/workflows/pages.yml | 1284 | UTILISÉ | Workflow actif de publication ou de validation CI. |
| 8 | .gitignore | 218 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 9 | android-download.html | 477 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 10 | backend/.dockerignore | 58 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 11 | backend/Dockerfile | 287 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 12 | backend/README.md | 468 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 13 | backend/app/__init__.py | 0 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 14 | backend/app/account.py | 1552 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 15 | backend/app/auth/__init__.py | 0 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 16 | backend/app/auth/dependencies.py | 702 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 17 | backend/app/auth/firebase.py | 1124 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 18 | backend/app/channels.py | 3967 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 19 | backend/app/config/__init__.py | 0 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 20 | backend/app/config/settings.py | 871 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 21 | backend/app/contacts.py | 3608 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 22 | backend/app/conversations.py | 2307 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 23 | backend/app/database.py | 2222 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 24 | backend/app/devices.py | 1624 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 25 | backend/app/groups.py | 6556 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 26 | backend/app/main.py | 3504 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 27 | backend/app/maintenance.py | 8135 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 28 | backend/app/media.py | 2415 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 29 | backend/app/messages.py | 10980 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 30 | backend/app/migrate.py | 1285 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 31 | backend/app/notifications.py | 1672 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 32 | backend/app/realtime.py | 2535 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 33 | backend/app/run_maintenance.py | 813 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 34 | backend/app/search.py | 684 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 35 | backend/app/security.py | 1913 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 36 | backend/app/settings.py | 2168 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 37 | backend/app/statuses.py | 4180 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 38 | backend/app/users.py | 1774 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 39 | backend/requirements.txt | 187 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 40 | backend/tests/test_api_foundation.py | 805 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 41 | backend/tests/test_architecture.py | 404 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 42 | backend/tests/test_auth.py | 428 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 43 | backend/tests/test_domain_routes.py | 4020 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 44 | backend/tests/test_health.py | 252 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 45 | backend/tests/test_users.py | 814 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 46 | capacitor.config.json | 263 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 47 | database/README.md | 627 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 48 | database/migrations/0001_initial.sql | 7573 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 49 | database/migrations/0002_message_lifecycle.sql | 573 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 50 | database/migrations/0003_security_lifecycle.sql | 484 | UTILISÉ | Code exécuté par le backend, les migrations ou leurs tests. |
| 51 | docker-compose.yml | 1259 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 52 | docs/acceptance-matrix-v2.md | 1243 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 53 | docs/architecture.md | 2457 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 54 | docs/design-system-v1.md | 893 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 55 | docs/file-inventory-v1.md | 18569 | NÉCESSAIRE | Inventaire de contrôle du nettoyage du dépôt. |
| 56 | docs/migration-contract.md | 1213 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 57 | docs/step-1-to-7-audit.md | 2369 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 58 | docs/target-architecture-checklist.md | 2178 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 59 | docs/verification-matrix.md | 4438 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 60 | firebase-client.js | 7070 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 61 | firebase-config.js | 508 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 62 | firebase.json | 56 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 63 | firebase/google-services.json | 1055 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 64 | firestore.rules | 393 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 65 | frontend/.env.example | 49 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 66 | frontend/Dockerfile | 156 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 67 | frontend/app/globals.css | 11134 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 68 | frontend/app/layout.tsx | 304 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 69 | frontend/app/page.tsx | 5044 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 70 | frontend/next-env.d.ts | 81 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 71 | frontend/next.config.ts | 331 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 72 | frontend/package.json | 489 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 73 | frontend/services/api.ts | 3092 | À CONSERVER TEMPORAIREMENT | Services préparatoires conservés pendant la migration fonctionnelle du frontend. |
| 74 | frontend/services/auth-sync.ts | 173 | À CONSERVER TEMPORAIREMENT | Services préparatoires conservés pendant la migration fonctionnelle du frontend. |
| 75 | frontend/services/offline-queue.ts | 1650 | À CONSERVER TEMPORAIREMENT | Services préparatoires conservés pendant la migration fonctionnelle du frontend. |
| 76 | frontend/services/push.ts | 773 | À CONSERVER TEMPORAIREMENT | Services préparatoires conservés pendant la migration fonctionnelle du frontend. |
| 77 | frontend/tsconfig.json | 422 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 78 | index.html | 3624 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 79 | package.json | 738 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 80 | vercel.json | 153 | NÉCESSAIRE | Fondation, compilation, documentation, Android ou configuration nécessaire à la cible actuelle. |
| 81 | vibe-android-build.md | 413 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 82 | vibe-app.js | 19603 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 83 | vibe-auth-layout.css | 848 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 84 | vibe-auth-ui.js | 6425 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 85 | vibe-avatar.js | 2410 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 86 | vibe-channels-modern.css | 4407 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 87 | vibe-channels.js | 11348 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 88 | vibe-chat.js | 15755 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 89 | vibe-contacts.js | 8172 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 90 | vibe-direct-chat.js | 4096 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 91 | vibe-download.js | 653 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 92 | vibe-media-config.js | 399 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 93 | vibe-media-enhanced.js | 11522 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 94 | vibe-media-render.js | 5501 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 95 | vibe-mobile-keyboard.js | 1685 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 96 | vibe-mobile-nav.css | 4348 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 97 | vibe-mobile-nav.js | 6676 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 98 | vibe-profile-chat-fixes.js | 8342 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 99 | vibe-profile-lock.js | 3125 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 100 | vibe-profile-sync.js | 2998 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 101 | vibe-status-channel-bindings.js | 1899 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 102 | vibe-status-channel-pro.css | 5293 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 103 | vibe-status-channel-pro.js | 15047 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 104 | vibe-stickers.css | 1770 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 105 | vibe-stickers.js | 7442 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 106 | vibe-theme.js | 2019 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 107 | vibe-transitions.css | 5576 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 108 | vibe-whatsapp-final.css | 20825 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |
| 109 | whatsapp-extra-features.js | 24554 | À CONSERVER TEMPORAIREMENT | Frontend historique ou couche de transition conservée jusqu'à parité et tests. |