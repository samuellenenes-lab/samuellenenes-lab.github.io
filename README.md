# Site perso · Samuel Le Nenes

Site statique (HTML/CSS/JS, sans framework) destiné à GitHub Pages.

```
index.html      Accueil : hero animé, profil, mémoire (graphique), parcours, outils, contact
cv.html         Version web du CV + téléchargement PDF
memoire.html    Synthèse du mémoire de M1 (graphiques, tableau des odds ratios)
assets/css/     style.css (couleurs et polices dans les variables en haut du fichier)
assets/js/      main.js (vagues animées, graphiques interactifs, rangées dépliables)
assets/docs/    CV et note de synthèse en PDF
assets/img/     favicon, schéma du modèle, aperçu PDF, image de partage (og-card.png)
assets/fonts/   polices hébergées avec le site (Instrument Serif, IBM Plex, licence OFL)
.nojekyll       indique à GitHub de servir les fichiers tels quels
```

## Mettre le site en ligne (github.io)

1. Votre compte GitHub est `samuellenenes-lab` : le site sera donc à l'adresse
   `https://samuellenenes-lab.github.io`.
2. Créez un nouveau dépôt **public** nommé exactement `samuellenenes-lab.github.io`
   (bouton « New repository »). Ne cochez rien d'autre.
3. Dans le dépôt : **Add file → Upload files**, glissez **le contenu** du dossier `site`
   (index.html, cv.html, memoire.html, README.md, le dossier assets et le fichier .nojekyll),
   puis **Commit changes**.
   Le fichier `.nojekyll` est caché sur Mac/Windows : si l'upload ne le prend pas, créez-le
   dans GitHub via **Add file → Create new file**, nommé `.nojekyll`, contenu vide.
4. **Settings → Pages** : Source = « Deploy from a branch », Branch = `main`, dossier `/ (root)`, **Save**.
5. Après 1 à 2 minutes, le site est en ligne sur `https://samuellenenes-lab.github.io`.
   L'onglet **Actions** montre l'état du déploiement.

Pour une mise à jour : modifiez le fichier directement dans GitHub (icône crayon) ou
ré-uploadez-le ; chaque commit redéploie le site.

En ligne de commande, si vous préférez :

```bash
cd site
git init -b main
git add .
git commit -m "Premier déploiement"
git remote add origin https://github.com/samuellenenes-lab/samuellenenes-lab.github.io.git
git push -u origin main
```

## Personnaliser

- **Photo** : déposez `assets/img/photo.jpg` (format portrait), puis dans `index.html`
  ajoutez `<img src="assets/img/photo.jpg" alt="Samuel Le Nenes">` juste après
  `<div class="coord rv" ...>` (bloc « Profil »). Elle s'affiche en noir et blanc.
- **Aperçu en local** : ouvrez un terminal dans le dossier et lancez `python -m http.server`,
  puis allez sur http://localhost:8000 (les polices ne se chargent pas en double-cliquant sur le fichier).
- **Couleurs** : variables `--accent`, `--ink` et `--paper` en haut de `assets/css/style.css`.
- **CV** : remplacez `assets/docs/CV_Samuel_Le_Nenes.pdf` en gardant le même nom.
- **Aperçu de partage** : `og:image` pointe déjà vers
  `https://samuellenenes-lab.github.io/assets/img/og-card.png`. Si le nom du dépôt change, modifiez-la.
