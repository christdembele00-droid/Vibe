# VIBE — Matrice de vérification 1→7

## Règle de migration

Aucun ancien flux n'est supprimé tant que son remplacement n'a pas été exécuté et validé sur le parcours Web et Android concerné.

## Cycle 2

| Domaine | État | Contrôle / conclusion |
|---|---|---|
| Firebase Web ↔ Firebase Android | PARTIELLEMENT VALIDÉ | Même projet Firebase identifié. La couche Web utilise Firebase JS; Android utilise le plugin natif puis réinjecte l'ID token dans Firebase JS. SHA-1 et google-services.json restent à valider dans l'environnement Android réel. |
| Capacitor ↔ Google natif | PARTIELLEMENT VALIDÉ | Le code appelle signInWithGoogle natif avec Credential Manager puis signInWithCredential côté Web. Le projet Android est désormais généré dans CI; test réel encore requis. |
| Cloudinary ↔ backend | FONDATION APPLIQUÉE | Endpoint FastAPI de signature ajouté. L'ancien upload direct reste intact jusqu'au test du nouveau flux. |
| Firestore ↔ PostgreSQL | NON MIGRÉ | Aucun ancien flux Firestore n'a été supprimé. Migration domaine par domaine obligatoire. |
| Android build | PIPELINE AJOUTÉ | CI génère Android depuis Capacitor. Le secret FIREBASE_GOOGLE_SERVICES_JSON_B64 est une précondition externe. |
| Frontend | LEGACY CONSERVÉ | L'interface actuelle reste intacte. Le passage vers Next.js n'est pas encore appliqué. |
| Backend | FONDATION APPLIQUÉE | FastAPI, auth Firebase, configuration, endpoint média et tests de base présents. |
| WebSocket | NON IMPLÉMENTÉ | Décision technique à appliquer après migration du premier domaine de messagerie. |
| FCM | NON IMPLÉMENTÉ | Le plugin et le flux device-token/backend restent à construire. |
| Sécurité | FONDATION PARTIELLE | Vérification ID token backend, séparation des secrets et autorisation backend posées. Rate limiting, App Check, audit métier et politiques fines restent à appliquer. |
| Migrations DB | RENFORCÉ | Runner SQL transactionnel + table schema_migrations + migration exécutée avant le backend en Compose/CI. |
| Gestion des erreurs | PARTIELLE | Erreurs auth/API de base couvertes. Contrat d'erreur global et états UI restent à uniformiser. |
| Offline/reconnexion | NON IMPLÉMENTÉ | Synchronisation WebSocket + reprise depuis PostgreSQL à appliquer avec la messagerie. |
| Groupes | SCHÉMA PRÉSENT | Règles métier, droits et tests end-to-end restent à implémenter. |
| Chaînes | SCHÉMA PRÉSENT | Abonnement, publication, droits et modération restent à implémenter. |
| Statuts | SCHÉMA PRÉSENT | Expiration, visibilité, vues et nettoyage restent à implémenter. |
| Médias | FONDATION PARTIELLE | Cloudinary reste fonctionnel côté legacy; nouveau backend de signature prêt; persistance PostgreSQL à brancher ensuite. |
| Suppression de compte | NON IMPLÉMENTÉE | Doit coordonner Firebase Auth, PostgreSQL, devices et médias. |
| Render/Vercel | NON VALIDÉ | Aucun déploiement de production ne doit être considéré comme validé depuis cette branche. |
| GitHub Actions | RENFORCÉ | CI backend + migration PostgreSQL + syntaxe frontend + validation Compose + pipeline Android ajoutés. |

## Décisions produit encore nécessaires

- Chiffrement de bout en bout (E2EE) : OUI/NON.
- Appels audio/vidéo en V1 : OUI/NON.
- Niveau offline : minimal ou avancé.

## Préconditions externes

1. Ajouter le secret GitHub FIREBASE_GOOGLE_SERVICES_JSON_B64.
2. Vérifier dans Firebase les SHA-1 des certificats de développement et, avant Google Play, du certificat Play App Signing.
3. Activer Google Sign-In dans Firebase.
4. Pour Cloudinary production, renseigner les credentials uniquement côté backend.
5. Ne jamais commit les credentials Firebase Admin ou le secret Cloudinary.

## Critère de passage

Un domaine n'est déclaré MIGRÉ que lorsque:
1. son remplacement existe;
2. ses tests automatisés passent;
3. son parcours Web fonctionne;
4. son parcours Android fonctionne;
5. les erreurs/réessais sont testés;
6. l'ancien flux reste disponible jusqu'à ce point;
7. seulement ensuite l'ancien flux peut être retiré.
