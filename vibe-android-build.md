# Vibe Android

Le dépôt contient maintenant une chaîne de build Android avec Capacitor.

À chaque push sur `main`, GitHub Actions prépare les fichiers web de Vibe, génère le projet Android, compile un APK debug et publie l'APK comme release prerelease et comme artifact.

Package Android : `com.vibe.app`

Le fichier APK généré est `android/app/build/outputs/apk/debug/app-debug.apk` pendant le build.
