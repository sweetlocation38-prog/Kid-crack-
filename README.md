# Kid Crack — La Forêt des Murmures

App éducative pour enfants (Expo / React Native + Supabase).

## État actuel

✅ Backend Supabase complet (11 tables, RLS activé, ~725 manches de contenu réparties sur 3 mini-jeux et 3 niveaux MS/GS/CP)
✅ Auth parent (email/mot de passe)
✅ Écran "Qui joue ?" avec création de profils enfants
✅ Carte simplifiée listant les mini-jeux
✅ **Le Pont des Lettres** entièrement jouable, connecté à Supabase, avec difficulté adaptative
🚧 Les Sons Magiques et Les Pommes de Luma : contenu prêt en base, écran de jeu à coder
✅ Vérifié : `npm install` réussit, `npx tsc --noEmit` ne remonte aucune erreur

## Comment obtenir un vrai APK à installer (méthode retenue : GitHub + EAS Build)

Cette méthode ne demande qu'une seule manipulation technique, et produit un vrai fichier à installer — pas de code à éditer en live, pas de dépendances à gérer une par une.

### Étape 1 — Mettre le code sur GitHub

1. Sur votre téléphone, ouvrez **github.com** dans Chrome (ou l'app GitHub)
2. Connectez-vous ou créez un compte gratuit
3. Créez un nouveau dépôt (bouton **"New repository"**), nommez-le par exemple `kid-crack`
4. Uploadez tous les fichiers de ce dossier dans le dépôt (GitHub permet d'ajouter des fichiers directement depuis le navigateur, par lots)

### Étape 2 — Lancer un build depuis expo.dev

1. Allez sur **expo.dev** dans Chrome, connectez-vous avec votre compte (titi38)
2. Ouvrez le projet **"Kid crack"** existant (`@titi38s-team/kid-crack`) — c'est important de réutiliser celui-ci, pas d'en créer un nouveau
3. Cherchez une option pour **relier un dépôt GitHub** au projet (généralement dans les réglages du projet, "GitHub" ou "Connect repository")
4. Une fois relié, cherchez le bouton pour lancer un **nouveau build** avec le profil **"preview"** (déjà configuré dans `eas.json` pour produire un APK Android directement installable)
5. Patientez 10 à 15 minutes — le build se fait sur les serveurs d'Expo, vous pouvez fermer l'onglet et revenir plus tard
6. Une fois terminé, un lien de téléchargement apparaît — appuyez dessus, téléchargez l'APK, et Android proposera de l'installer directement

### Étape 3 — Mises à jour suivantes

Une fois ce premier build installé, les prochaines évolutions du code pourront être poussées via **EAS Update** (beaucoup plus rapide qu'un nouveau build complet) — on verra ça le moment venu.

## Variables sensibles

L'URL et la clé publique Supabase sont dans `src/lib/supabase.ts`. C'est volontaire : la clé "publishable" est faite pour être publique, la sécurité vient des politiques RLS sur chaque table.
