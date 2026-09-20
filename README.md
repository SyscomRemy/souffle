# SOUFFLE

Fusée en apesanteur dans un puits vertical infini. Un seul pouce, sans menu, sans paiement.

## Fichiers

- `index.html` — le jeu complet, un seul fichier autonome (canvas 2D, aucune dépendance).
- `worker/worker.js` — backend optionnel (Cloudflare Workers) pour le classement du jour, le percentile, la division, et le fantôme du meneur.
- `worker/DEPLOY.md` — déploiement du worker en 5 minutes, sans CLI.

## Jouer

Ouvrir `index.html` dans un navigateur. Fonctionne hors ligne, sur mobile et sur PC.

## Classement réseau (optionnel)

Par défaut le jeu est 100 % hors ligne (`NET=''` dans `index.html`). Suivre
`worker/DEPLOY.md` pour activer le classement du jour ; aucune donnée
personnelle, aucun paiement, aucune cagnotte — uniquement des scores agrégés.

**Avertissement** : ce backend ne vérifie pas les scores côté serveur. Il
convient à un classement de vanité, pas à une cagnotte en argent réel — voir
l'avertissement en tête de `worker/worker.js`.

## Correctif desktop

Le canvas utilise une résolution logique plafonnée (480×1000 CSS px) et se
centre avec des bandes sur les écrans larges, au lieu d'élargir le champ de
vision — un FOV identique sur tous les appareils garde la graine du jour
équitable entre joueurs. Comportement mobile inchangé (tout téléphone réel
reste sous ce plafond).
