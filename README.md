VIBE - Messagerie Intelligente
"Ton monde, au même endroit."

VIBE est une application de messagerie instantanée moderne, rapide et sécurisée, conçue pour offrir une expérience utilisateur fluide et familière. Pensée comme une alternative élégante aux standards du marché, VIBE reprend les codes visuels et fonctionnels qui ont fait leurs preuves (inspiré du design WhatsApp) tout en y intégrant l'identité de marque de FREEB.

🚀 Fonctionnalités Principales
VIBE propose un ensemble complet de fonctionnalités pour une communication totale :

💬 Messagerie en temps réel : Discutez instantanément avec vos contacts.

👥 Communautés et Groupes : Gérez vos conversations de groupe et retrouvez vos communautés.

📸 Statuts (Stories) : Partagez des moments éphémères (photos/vidéos) visibles pendant 24h.

📞 Appels Vocaux et Vidéo : Lancez des appels sécurisés directement depuis l'application.

📎 Partage de Médias : Envoyez facilement des photos, vidéos et documents.

✨ Design Familier et Moderne : Une interface claire, intuitive et inspirée du design system WhatsApp, revisitée avec la palette de couleurs FREEB (Violet et Cyan).

🛠️ Technologies Utilisées
L'application VIBE repose sur une stack technique robuste pour garantir performance et évolutivité :

Frontend
Langages : HTML5, CSS3 (avec variables et Flexbox/Grid) et JavaScript (ES6+).

Design : Reprise millimétrée de l'interface WhatsApp (tailles, espacements, typographie Segoe UI) avec une charte graphique personnalisée (Noir, Violet, Cyan).

Icônes : FontAwesome 6.

Architecture & Temps Réel
Back-end : Conçu pour être interfacé avec Firebase (Firestore pour la base de données temps réel, Firebase Auth pour l'authentification).

Logique : Gestion de l'état de l'application en JavaScript, écouteurs d'événements onSnapshot() pour Firestore, et gestion des modales (appels, statuts).

📦 Installation et Lancement
VIBE est une application web statique qui ne nécessite pas de serveur d'application complexe pour être lancée en mode développement.

Prérequis
Aucun prérequis spécifique n'est nécessaire pour exécuter la version locale statique.

Étapes
Cloner le dépôt :

Bash
git clone https://github.com/VOTRE-UTILISATEUR/vibe.git
Accéder au dossier du projet :

Bash
cd vibe
Ouvrir l'interface :
Simplement, ouvrez le fichier index.html dans votre navigateur web préféré (Chrome, Firefox, Edge).

Note importante pour le mode réel : Pour que l'envoi et la réception de messages fonctionnent réellement entre utilisateurs, vous devez configurer un projet Firebase et remplacer les clés API dans le fichier app.js.

🎨 Aperçu Visuel
L'interface de VIBE est conçue pour être immédiatement intuitive pour les habitués de WhatsApp, avec une touche de modernité FREEB.

Le Hub de discussion : Une barre latérale fixe avec un profil utilisateur mis en valeur par un anneau cyan.

Le Chat en direct : Des bulles de messages personnalisées (dégradé violet pour les messages envoyés, fond sombre pour les reçus), et des accusés de lecture en double coche cyan.

Les Modales : Des interfaces élégantes et sombres pour les appels vidéo et la visionneuse de statuts.

📜 Roadmap et Contributions
VIBE est un projet en constante évolution. Les prochaines étapes de développement incluent :

[ ] Implémentation complète de Firebase Authentication.

[ ] Connexion réelle à Firestore pour la persistance des données.

[ ] Intégration du module WebRTC pour les appels.

[ ] Ajout de la fonctionnalité de recherche globale.

Les contributions sont les bienvenues ! N'hésitez pas à forker le projet et à soumettre des Pull Requests.

👨‍💻 Auteur
FREEBOY (Développeur principal)

⚖️ Licence
Ce projet est sous licence MIT.

Ce README est généré pour accompagner la conception technique de l'application VIBE.
