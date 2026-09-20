# Déployer le worker réseau (5 minutes, gratuit)

Je ne peux pas déployer ce worker moi-même : `api.cloudflare.com` n'est pas
joignable depuis mon environnement, avec ou sans identifiants. Ce qui suit
se fait entièrement depuis le tableau de bord web, sans CLI.

## 1. Créer le worker

1. [dash.cloudflare.com](https://dash.cloudflare.com) → créer un compte gratuit si besoin.
2. **Workers & Pages** → **Create** → **Create Worker**.
3. Donne-lui un nom (ex. `souffle-net`) → **Deploy**.
4. **Edit code** → remplace tout le contenu par celui de `worker.js` → **Deploy**.

## 2. Créer le stockage (KV)

1. **Workers & Pages** → **KV** → **Create namespace** → nomme-le `SOUFFLE_KV`.
2. Retourne sur ton worker → **Settings** → **Variables** → **KV Namespace Bindings**.
3. **Add binding** : nom de variable `SOUFFLE_KV`, namespace = celui que tu viens de créer → **Save and deploy**.

## 3. Récupérer l'URL

Ton worker répond sur `https://souffle-net.<ton-sous-domaine>.workers.dev`
(visible en haut de la page du worker).

## 4. Brancher le jeu

Dans `index.html`, cherche :

```js
var NET='';
```

Remplace par ton URL, **sans slash final** :

```js
var NET='https://souffle-net.<ton-sous-domaine>.workers.dev';
```

C'est tout. `NET=''` gardait le jeu 100 % hors ligne — dès que l'URL est
renseignée, le classement du jour, la division et le fantôme du meneur
s'activent, sans rien casser si le worker est injoignable (échec réseau
ignoré silencieusement côté client, déjà géré dans le code existant).

## Limites à connaître

- **Plan gratuit Cloudflare** : 100 000 requêtes/jour, largement suffisant
  pour démarrer. Au-delà, plan payant à l'usage (pas d'abonnement fixe).
- **Le score posté n'est pas vérifié.** Voir l'avertissement en tête de
  `worker.js` : suffisant pour un classement de vanité, **insuffisant**
  pour toute cagnotte en argent réel.
- **L'échantillon de percentile est plafonné à 1000 scores/jour.** Au-delà,
  le calcul reste indicatif, pas exact. Si le jeu grossit vraiment,
  migrer vers Cloudflare D1 (base SQL, toujours gratuit à ce volume) sera
  la suite logique — hors scope de cette livraison.
