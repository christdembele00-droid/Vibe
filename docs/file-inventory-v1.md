# VIBE — Inventaire fichier par fichier

**Branche auditée :** `architecture-foundation-v1`  
**HEAD audité :** `2564981dede914d99f3c2d4761b34b42b53e4a1a`  
**Date :** 17 septembre 2026  
**Nombre de fichiers suivis :** 110

## Règle de classement

- **UTILISÉ** : exécuté/importé par le runtime ou la CI actuels.
- **NÉCESSAIRE** : fondation/configuration requise par la cible, même sans import direct par l’écran actuel.
- **DOUBLON** : fonctionnalité représentée par un autre artefact ; suppression uniquement après conservation de ses capacités et passage de la CI.
- **OBSOLÈTE** : uniquement lorsqu’un remplacement testé est démontré.
- **À CONSERVER TEMPORAIREMENT** : ancien système, module non encore migré ou élément dont la suppression n’est pas suffisamment prouvée.

## Résultat

| Catégorie | Nombre |
|---|---:|
| À CONSERVER TEMPORAIREMENT | 40 |
| DOUBLON | 0 |
| NÉCESSAIRE | 35 |
| UTILISÉ | 35 |

**Conclusion du passage actuel :** aucun fichier n’est classé **OBSOLÈTE** avec un niveau de preuve suffisant. Le pipeline Android est maintenant séparé proprement en deux rôles : `android.yml` pour la validation debug des PR et `build-android.yml` pour le release sur `main`/manuel. Le frontend historique reste volontairement dans **À CONSERVER TEMPORAIREMENT** tant que Next.js n’a pas la parité fonctionnelle. Le workflow de purge destructive a, lui, été retiré ; l’outil de maintenance Python reste disponible.

## Nettoyage contrôlé recommandé

1. D’abord migrer les fonctions du frontend historique vers Next.js/les services backend, sans suppression de l’ancien.
2. Ajouter les tests de parité correspondants.
3. Après CI réussie, retirer les modules historiques par petits lots.
4. Réévaluer ensuite les fichiers Firestore historiques et les workflows associés.
5. Garder les deux workflows Android avec leurs rôles distincts : debug PR d’un côté, release `main`/manuel de l’autre.

## Inventaire complet

| # | Fichier | Taille | Classement | Justification |
|---:|---|---:|---|---|
| 1 | `.dockerignore` | 120 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 2 | `.env.example` | 487 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 3 | `.github/workflows/android.yml` | 3107 | DOUBLON | Deuxième pipeline Android concurrent ; candidat à fusion après conservation des mêmes triggers/capacités. |
| 4 | `.github/workflows/backend.yml` | 2170 | UTILISÉ | CI principale : backend, frontend Next.js et validation Docker Compose. |
| 5 | `.github/workflows/build-android.yml` | 6663 | UTILISÉ | Pipeline Android release/debug et validation Firebase/Capacitor. |
| 6 | `.github/workflows/deploy-firestore-rules.yml` | 1313 | À CONSERVER TEMPORAIREMENT | Ancienne couche Firestore encore présente pour le frontend historique ; à retirer après migration complète vers PostgreSQL. |
| 7 | `.github/workflows/purge-vibe.yml` | 1695 | À CONSERVER TEMPORAIREMENT | Outil opérationnel de purge destructive de transition ; non nécessaire au runtime applicatif. |
| 8 | `.gitignore` | 218 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 9 | `android-download.html` | 477 | À CONSERVER TEMPORAIREMENT | Fonction de distribution historique non référencée par l’entrée actuelle ; conservation temporaire jusqu’à vérification de non-utilisation externe. |
| 10 | `backend/.dockerignore` | 58 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 11 | `backend/app/__init__.py` | 0 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 12 | `backend/app/account.py` | 1552 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 13 | `backend/app/auth/__init__.py` | 0 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 14 | `backend/app/auth/dependencies.py` | 702 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 15 | `backend/app/auth/firebase.py` | 1124 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 16 | `backend/app/channels.py` | 3967 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 17 | `backend/app/config/__init__.py` | 0 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 18 | `backend/app/config/settings.py` | 871 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 19 | `backend/app/contacts.py` | 3608 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 20 | `backend/app/conversations.py` | 2307 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 21 | `backend/app/database.py` | 2222 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 22 | `backend/app/devices.py` | 1624 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 23 | `backend/app/groups.py` | 6556 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 24 | `backend/app/main.py` | 3504 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 25 | `backend/app/maintenance.py` | 8135 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 26 | `backend/app/media.py` | 2415 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 27 | `backend/app/messages.py` | 10980 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 28 | `backend/app/migrate.py` | 1285 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 29 | `backend/app/notifications.py` | 1672 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 30 | `backend/app/realtime.py` | 2535 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 31 | `backend/app/run_maintenance.py` | 813 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 32 | `backend/app/search.py` | 684 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 33 | `backend/app/security.py` | 1913 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 34 | `backend/app/settings.py` | 2168 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 35 | `backend/app/statuses.py` | 4180 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 36 | `backend/app/users.py` | 1774 | UTILISÉ | Importé/exécuté par le backend, les migrations ou la CI actuels. |
| 37 | `backend/Dockerfile` | 287 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 38 | `backend/railway.toml` | 223 | NÉCESSAIRE | Configuration de déploiement backend hors Render ; provider actuel à confirmer. |
| 39 | `backend/README.md` | 468 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 40 | `backend/requirements.txt` | 187 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 41 | `backend/tests/test_api_foundation.py` | 805 | UTILISÉ | Exécuté par Foundation CI. |
| 42 | `backend/tests/test_architecture.py` | 404 | UTILISÉ | Exécuté par Foundation CI. |
| 43 | `backend/tests/test_auth.py` | 428 | UTILISÉ | Exécuté par Foundation CI. |
| 44 | `backend/tests/test_domain_routes.py` | 4020 | UTILISÉ | Exécuté par Foundation CI. |
| 45 | `backend/tests/test_health.py` | 252 | UTILISÉ | Exécuté par Foundation CI. |
| 46 | `backend/tests/test_users.py` | 814 | UTILISÉ | Exécuté par Foundation CI. |
| 47 | `capacitor.config.json` | 263 | NÉCESSAIRE | Configuration native Capacitor Android. |
| 48 | `database/migrations/0001_initial.sql` | 7573 | UTILISÉ | Appliqué par backend/app/migrate.py et Foundation CI. |
| 49 | `database/migrations/0002_message_lifecycle.sql` | 573 | UTILISÉ | Appliqué par backend/app/migrate.py et Foundation CI. |
| 50 | `database/migrations/0003_security_lifecycle.sql` | 484 | UTILISÉ | Appliqué par backend/app/migrate.py et Foundation CI. |
| 51 | `database/README.md` | 627 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 52 | `docker-compose.yml` | 1259 | NÉCESSAIRE | Environnement local + validation CI PostgreSQL/backend. |
| 53 | `docs/acceptance-matrix-v2.md` | 1243 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 54 | `docs/architecture.md` | 2530 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 55 | `docs/design-system-v1.md` | 893 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 56 | `docs/migration-contract.md` | 1213 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 57 | `docs/step-1-to-7-audit.md` | 2369 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 58 | `docs/target-architecture-checklist.md` | 2178 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 59 | `docs/verification-matrix.md` | 4438 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 60 | `firebase-client.js` | 7070 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 61 | `firebase-config.js` | 508 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 62 | `firebase.json` | 56 | À CONSERVER TEMPORAIREMENT | Ancienne couche Firestore encore présente pour le frontend historique ; à retirer après migration complète vers PostgreSQL. |
| 63 | `firebase/google-services.json` | 1055 | NÉCESSAIRE | Configuration Android Firebase nécessaire au pipeline natif Google Auth. |
| 64 | `firestore.rules` | 393 | À CONSERVER TEMPORAIREMENT | Ancienne couche Firestore encore présente pour le frontend historique ; à retirer après migration complète vers PostgreSQL. |
| 65 | `frontend/.env.example` | 49 | NÉCESSAIRE | Élément nécessaire à la fondation ou à la cible de déploiement. |
| 66 | `frontend/app/globals.css` | 11134 | NÉCESSAIRE | Entrée actuelle du frontend Next.js, compilée par `next build`. |
| 67 | `frontend/app/layout.tsx` | 304 | NÉCESSAIRE | Entrée actuelle du frontend Next.js, compilée par `next build`. |
| 68 | `frontend/app/page.tsx` | 5044 | NÉCESSAIRE | Entrée actuelle du frontend Next.js, compilée par `next build`. |
| 69 | `frontend/Dockerfile` | 156 | NÉCESSAIRE | Conteneurisation possible ; non utilisé par Vercel actuellement, donc candidat à simplification après déploiement. |
| 70 | `frontend/next-env.d.ts` | 81 | NÉCESSAIRE | Métadonnées/compilation du frontend Next.js. |
| 71 | `frontend/package.json` | 489 | NÉCESSAIRE | Métadonnées/compilation du frontend Next.js. |
| 72 | `frontend/services/api.ts` | 3092 | À CONSERVER TEMPORAIREMENT | Composant actuellement conservé pendant la migration vers l’architecture Next.js/PostgreSQL. |
| 73 | `frontend/services/auth-sync.ts` | 173 | À CONSERVER TEMPORAIREMENT | Composant actuellement conservé pendant la migration vers l’architecture Next.js/PostgreSQL. |
| 74 | `frontend/services/offline-queue.ts` | 1650 | À CONSERVER TEMPORAIREMENT | Composant actuellement conservé pendant la migration vers l’architecture Next.js/PostgreSQL. |
| 75 | `frontend/services/push.ts` | 773 | À CONSERVER TEMPORAIREMENT | Composant actuellement conservé pendant la migration vers l’architecture Next.js/PostgreSQL. |
| 76 | `frontend/tsconfig.json` | 422 | NÉCESSAIRE | Métadonnées/compilation du frontend Next.js. |
| 77 | `index.html` | 3624 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 78 | `package.json` | 738 | NÉCESSAIRE | Présent dans l’arbre actuel ; non classé comme suppressible sans vérification supplémentaire. |
| 79 | `vercel.json` | 140 | NÉCESSAIRE | Configuration prévue pour le déploiement du frontend Next.js sur Vercel. |
| 80 | `vibe-android-build.md` | 413 | À CONSERVER TEMPORAIREMENT | Documentation historique Android ; utile tant que le pipeline Capacitor/Google Auth n’est pas totalement rationalisé. |
| 81 | `vibe-app.js` | 19603 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 82 | `vibe-auth-layout.css` | 848 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 83 | `vibe-auth-ui.js` | 6425 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 84 | `vibe-avatar.js` | 2410 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 85 | `vibe-channels-modern.css` | 4407 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 86 | `vibe-channels.js` | 11348 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 87 | `vibe-chat.js` | 15755 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 88 | `vibe-contacts.js` | 8172 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 89 | `vibe-direct-chat.js` | 4096 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 90 | `vibe-download.js` | 653 | À CONSERVER TEMPORAIREMENT | Fonction de distribution historique non référencée par l’entrée actuelle ; conservation temporaire jusqu’à vérification de non-utilisation externe. |
| 91 | `vibe-media-config.js` | 399 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 92 | `vibe-media-enhanced.js` | 11522 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 93 | `vibe-media-render.js` | 5501 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 94 | `vibe-mobile-keyboard.js` | 1685 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 95 | `vibe-mobile-nav.css` | 4348 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 96 | `vibe-mobile-nav.js` | 6676 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 97 | `vibe-profile-chat-fixes.js` | 8342 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 98 | `vibe-profile-lock.js` | 3125 | À CONSERVER TEMPORAIREMENT | Module sans référence trouvée dans le dépôt ; conservation temporaire jusqu’à preuve d’inutilisation externe. |
| 99 | `vibe-profile-sync.js` | 2998 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 100 | `vibe-status-channel-bindings.js` | 1899 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 101 | `vibe-status-channel-pro.css` | 5293 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 102 | `vibe-status-channel-pro.js` | 15047 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 103 | `vibe-stickers.css` | 1770 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 104 | `vibe-stickers.js` | 7442 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 105 | `vibe-theme.js` | 2019 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 106 | `vibe-transitions.css` | 5576 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 107 | `vibe-whatsapp-final.css` | 20825 | À CONSERVER TEMPORAIREMENT | Frontend historique encore utilisé par l’entrée HTML/Android ; à retirer seulement après parité Next.js et tests. |
| 108 | `whatsapp-extra-features.js` | 24554 | À CONSERVER TEMPORAIREMENT | Composant actuellement conservé pendant la migration vers l’architecture Next.js/PostgreSQL. |

| 108 | `docs/file-inventory-v1.md` | 0 | NÉCESSAIRE | Rapport d’audit maintenu dans le dépôt pour contrôler le nettoyage fichier par fichier. |
| 109 | `frontend/next.config.ts` | — | NÉCESSAIRE | Configure le build Next.js en export statique pour GitHub Pages avec `/Vibe` comme base path. |
| 110 | `.github/workflows/pages.yml` | — | NÉCESSAIRE | Construit et déploie le frontend Next.js vers GitHub Pages. |
