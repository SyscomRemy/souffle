/* ============================================================================
 * SOUFFLE — worker réseau (Cloudflare Workers, plan gratuit)
 *
 * Rôle strict : agréger les scores du jour et répondre deux routes.
 *   GET  /day?s=<graine>   -> { n, best, ghost, pct:100 }
 *   POST /run              -> { n, best, pct, ghost }  body {u,s,sc,d,g}
 *
 * Ce que ce worker NE fait PAS, volontairement :
 *   - aucun paiement, aucune cagnotte, aucune notion de prix ;
 *   - aucune validation cryptographique du score (voir AVERTISSEMENT).
 *
 * AVERTISSEMENT — à lire avant tout usage avec de l'argent réel :
 * Le score posté ici est CELUI QUE LE CLIENT ENVOIE. N'importe qui peut
 * appeler POST /run à la main avec un score inventé. C'est sans
 * conséquence pour un classement de vanité (percentile, division,
 * fantôme) — mais si une cagnotte en argent réel est un jour branchée
 * là-dessus, ce backend est INSUFFISANT et n'importe qui peut la
 * remporter en trichant. Une cagnotte exige une rejouabilité côté
 * serveur : le client envoie la suite d'entrées horodatées, le serveur
 * rejoue la simulation déterministe (la graine du jour le permet) et
 * vérifie que le score en découle. C'est un chantier séparé — voir le
 * rapport juridique fourni : pas de cagnotte sans cette vérification
 * ET sans avis d'avocat.
 * ==========================================================================*/

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      if (url.pathname === '/day' && req.method === 'GET') {
        return json(await dayStats(env, url.searchParams.get('s')), cors);
      }
      if (url.pathname === '/run' && req.method === 'POST') {
        const body = await req.json();
        return json(await postRun(env, body), cors);
      }
      return json({ error: 'not_found' }, cors, 404);
    } catch (e) {
      return json({ error: 'bad_request' }, cors, 400);
    }
  }
};

function json(obj, cors, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'content-type': 'application/json' }, cors)
  });
}

// Graine attendue au format YYYY-M-D (identique à seedStr côté client) — un
// simple garde-fou de forme, pas une preuve d'intégrité.
function validSeed(s) {
  return typeof s === 'string' && s.length >= 6 && s.length <= 16 && /^\d{4}-\d{1,2}-\d{1,2}$/.test(s);
}

async function dayStats(env, seed) {
  if (!validSeed(seed)) return { n: 0, best: 0, ghost: null };
  const agg = await getAgg(env, seed);
  return { n: agg.n, best: agg.best, ghost: agg.ghost, pct: 100 };
}

async function postRun(env, body) {
  const seed = body && body.s;
  const uid = body && String(body.u || '').slice(0, 40);
  const sc = Number(body && body.sc);
  const dp = Number(body && body.d);
  const ghost = body && typeof body.g === 'string' ? body.g.slice(0, 20000) : null;

  if (!validSeed(seed) || !uid) return { error: 'invalid' };
  // Bornes larges de plausibilité : un score/une profondeur négatifs, non
  // finis ou aberrants sont rejetés sans bloquer le joueur (le jeu ignore
  // silencieusement l'échec réseau côté client).
  if (!isFinite(sc) || sc < 0 || sc > 5000000) return { error: 'invalid' };
  if (!isFinite(dp) || dp < 0 || dp > 200000) return { error: 'invalid' };

  // Anti-spam minimal : un run par UID au maximum toutes les 8 secondes.
  const rl = await env.SOUFFLE_KV.get('rl:' + uid);
  const now = Date.now();
  if (rl && now - Number(rl) < 8000) {
    const agg = await getAgg(env, seed);
    return { n: agg.n, best: agg.best, pct: pctOf(agg, sc), ghost: null };
  }
  await env.SOUFFLE_KV.put('rl:' + uid, String(now), { expirationTtl: 60 });

  const agg = await getAgg(env, seed);
  agg.n += 1;

  // Échantillon borné (1000 scores max) pour estimer un percentile sans
  // faire grossir la clé indéfiniment — suffisant pour l'échelle d'un
  // classement quotidien indépendant, pas conçu pour des millions de runs/jour.
  agg.sample.push(Math.round(sc));
  if (agg.sample.length > 1000) agg.sample.shift();

  const isNewBest = sc > agg.best;
  if (isNewBest) {
    agg.best = Math.round(sc);
    if (ghost) agg.ghost = ghost;
  }

  await env.SOUFFLE_KV.put(aggKey(seed), JSON.stringify(agg), { expirationTtl: 60 * 60 * 24 * 3 });

  return { n: agg.n, best: agg.best, pct: pctOf(agg, sc), ghost: isNewBest ? null : agg.ghost };
}

function pctOf(agg, sc) {
  if (!agg.sample.length) return 100;
  var below = 0;
  for (var i = 0; i < agg.sample.length; i++) if (agg.sample[i] <= sc) below++;
  return Math.round((below / agg.sample.length) * 100);
}

function aggKey(seed) { return 'agg:' + seed; }

async function getAgg(env, seed) {
  const raw = await env.SOUFFLE_KV.get(aggKey(seed));
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* clé corrompue, on repart propre */ }
  }
  return { n: 0, best: 0, ghost: null, sample: [] };
}
