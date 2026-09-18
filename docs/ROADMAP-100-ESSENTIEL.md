# VIBE — 100 étapes indispensables

Priorité absolue : stabilité, fonctionnement réel et absence de blocage. Pas de nouvelle feature tant que ces étapes ne sont pas validées.

## Stabilisation

001. Bloquer les nouvelles features
002. Identifier le vrai entrypoint Web
003. Identifier le vrai entrypoint Android
004. Réparer le démarrage sans erreur
005. Ajouter un smoke test

## Build

006. Valider npm ci
007. Valider TypeScript
008. Valider le build frontend
009. Valider le build Android
010. Conserver un AAB reproductible

## Auth

011. Tester inscription
012. Tester connexion
013. Tester déconnexion
014. Tester persistance session
015. Tester Google Sign-In Android

## Firebase

016. Vérifier provider Google
017. Vérifier SHA-1 release
018. Vérifier configuration Web
019. Vérifier configuration Android
020. Vérifier règles Firestore

## Navigation

021. Réparer tous les clics
022. Réparer retour arrière
023. Réparer modales
024. Réparer overlays bloquants
025. Réparer responsive mobile

## Chat

026. Créer conversation privée
027. Ouvrir conversation
028. Envoyer texte
029. Persister message
030. Recharger messages

## Messages

031. Conserver ordre
032. Éviter doublons
033. Afficher état envoyé
034. Gérer message vide
035. Gérer messages longs

## WebSocket

036. Connecter WebSocket
037. Authentifier WebSocket
038. Recevoir message temps réel
039. Reconnecter après perte réseau
040. Nettoyer connexion à la déconnexion

## Backend

041. Vérifier démarrage FastAPI
042. Uniformiser erreurs API
043. Valider entrées
044. Protéger routes privées
045. Ajouter healthcheck

## PostgreSQL

046. Vérifier connexion
047. Vérifier migrations
048. Vérifier users
049. Vérifier conversations
050. Vérifier messages

## Médias

051. Tester Cloudinary
052. Uploader image
053. Uploader vidéo
054. Limiter types et tailles
055. Persister URL média

## Notifications

056. Enregistrer token FCM
057. Recevoir push
058. Ouvrir bonne conversation
059. Gérer token invalide
060. Éviter doublons

## Profils

061. Créer profil
062. Modifier nom
063. Modifier avatar
064. Afficher profil
065. Synchroniser profil

## Groupes

066. Créer groupe
067. Ajouter membre
068. Retirer membre autorisé
069. Envoyer message groupe
070. Vérifier permissions admin

## Appels

071. Initialiser signalisation
072. Demander micro
073. Demander caméra
074. Établir audio/vidéo
075. Nettoyer appel

## IA

076. Créer endpoint IA stable
077. Construire contexte conversation
078. Limiter contexte
079. Définir CognitiveState minimal
080. Enregistrer expérience

## Mémoire IA

081. Mémoire de travail
082. Mémoire épisodique
083. Recherche mémoire pertinente
084. Évaluer souvenir
085. Éviter fuite de contexte

## Sécurité

086. Retirer secrets codés en dur
087. Sanitiser affichage
088. Protéger données privées
089. Protéger uploads
090. Ne jamais logger tokens

## Tests

091. Test connexion
092. Test message
093. Test temps réel
094. Test média
095. Test release complet

## Production

096. Vérifier variables d’environnement
097. Vérifier CORS production
098. Vérifier HTTPS
099. Vérifier logs production
100. Préparer rollback

