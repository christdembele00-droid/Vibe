# VIBE Design System V1

La nouvelle couche visuelle applique la direction UX/UI 2026 sans modifier la fondation backend.

Principes: surfaces et profondeur plutôt que bordures rigides; composer flottant; header glass; Smart Radius; médias edge-to-edge; chaînes Bento; Segmented Control animé; panneau IA Drawer; recherche compacte; présence intégrée; Inter/Plus Jakarta Sans; slate profond; micro-interactions; prefers-reduced-motion.

Règle de migration: le frontend legacy reste conservé tant que la nouvelle interface Next.js n'a pas atteint la parité fonctionnelle et passé les tests d'acceptation.

Fondation non négociable: Next.js/React → FastAPI → PostgreSQL. Firebase Auth = identité. FCM = push. Cloudinary = médias. WebSocket = transport temps réel. Capacitor = Android. Aucune donnée métier VIBE ne doit être déplacée dans WebSocket, FCM ou Firebase Auth.
