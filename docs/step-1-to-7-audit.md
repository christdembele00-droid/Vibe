# VIBE — Audit des étapes 1 à 7

## Étape 1 — Complétude
Les domaines critiques sont couverts: identité, utilisateurs, contacts, conversations, messages, groupes, chaînes, statuts, médias, notifications, recherche, sécurité, appareils, modération, erreurs réseau, migrations, tests, déploiement et supervision.

## Étape 2 — Surplus
La fondation V1 n'introduit pas Redis, Kafka, RabbitMQ, Kubernetes, microservices, Elasticsearch, Neo4j, multi-région ou Firestore comme source de données VIBE.

## Étape 3 — Responsabilités
Firebase Auth = identité. PostgreSQL = données VIBE. Cloudinary = médias. FCM = push. WebSocket = transport temps réel. FastAPI = règles métier et autorisation. Le frontend n'est pas une frontière de sécurité.

## Étape 4 — Flux
Les flux critiques doivent suivre: authentification → API → validation/autorisation → persistance → événement temps réel → push si nécessaire. Une reconnexion WebSocket doit toujours resynchroniser depuis PostgreSQL.

## Étape 5 — Base de données
Le schéma initial couvre les entités V1 et possède des clés étrangères, contraintes, index et comportements de suppression explicites. Les migrations sont versionnées.

## Étape 6 — Validation technique
La fondation applique les décisions vérifiées: vérification des Firebase ID tokens côté backend, secrets hors dépôt, séparation média/données, API versionnée et tests automatisés.

## Étape 7 — Application
La fondation a été appliquée sur une branche dédiée sans supprimer l'application existante. Le backend CI doit passer avant fusion.

## Risques contrôlés
- L'ancienne application utilise encore Firestore: elle reste intacte pendant la migration.
- Le script Android historique copie actuellement le dépôt vers le dossier www: il doit être durci avant de devenir le pipeline de production.
- Le choix E2EE, des appels audio/vidéo et du niveau de synchronisation offline reste à décider avant d'implémenter les domaines concernés.
- Les identifiants Firebase Web publics ne sont pas des secrets; les credentials Firebase Admin et secrets Cloudinary ne doivent jamais être commités.

## Règle de progression
Aucun domaine legacy n'est supprimé avant qu'une implémentation FastAPI/PostgreSQL équivalente soit testée et que le parcours Web/Android soit validé.
