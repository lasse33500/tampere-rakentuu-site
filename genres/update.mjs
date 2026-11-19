// Manse nyt: genrejen täydennys GitHub Actionsissa (MusicBrainz torjuu Cloudflaren IP:t).
// Lukee tapahtumat Workerin rajapinnasta, hakee uusille artisteille genren MusicBrainzista (1 haku / 1,1 s)
// ja Wikidatasta varalla, ja kirjoittaa nyt-data/genres.json. Worker lukee tiedoston assets-puolelta.
import fs from 'node:fs';
import { artistKey, mbGenre, wdGenre, descGenre } from '../worker/genre.js';
const API = process.env.NYT_API || 'https://mansessa.lasse-syrjala-01a.workers.dev/nyt/api/tapahtumat.json';
const OUT = 'nyt-data/genres.json';
const UA = 'MansessaNyt/0.1 ( https://mansessa.fi/nyt ; lasse33500@gmail.com )';
const MAX = +(process.env.MAX || 250);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let gmap = {};
try { gmap = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
const r = await fetch(API + '?v=' + Date.now(), { headers: { 'User-Agent': UA } });
if (!r.ok) throw new Error('API ' + r.status);
const { events } = await r.json();
const keys = [...new Set(events.map(artistKey).filter(Boolean))];
const urlOf = {};
for (const e of events) { const k = artistKey(e); if (k && !urlOf[k] && e.url && !/lippu\.fi|tiketti\.fi|ticketmaster|eventim|lippupiste/i.test(e.url)) urlOf[k] = e.url; }
// esittelyteksti tapahtumapaikan omalla sivulla (genre avainsanoista), kun tietokannoista ei löytynyt
async function fromDesc(k) {
  if (!urlOf[k]) return null;
  try { const r = await fetch(urlOf[k], { headers: { 'User-Agent': UA, 'Accept': 'text/html' } }); await sleep(1000); return r.ok ? descGenre(await r.text()) : null; } catch { return null; }
}
const now = Date.now(); let used = 0, mbFails = 0;
for (const k of keys) {
  const hit = gmap[k];
  if (hit && !hit.g && !hit.d) { const g = await fromDesc(k); hit.d = 1; if (g) { hit.g = g; hit.s = 'desc'; } console.log(k, '=> desc', g); continue; }
  if (hit && (hit.g || now - hit.t < 14 * 864e5)) continue;
  if (used++ >= MAX) break;
  let g = null, s = '';
  if (mbFails < 5) {
    try { g = await mbGenre(k, UA); s = 'mb'; mbFails = 0; }
    catch (e) { mbFails++; console.log(k, 'MB', e.message); await sleep(3000); }
    await sleep(1100);
  }
  if (!g) { try { const w = await wdGenre(k, UA); if (w) { g = w; s = 'wd'; } else s = s || 'wd'; } catch (e) { console.log(k, e.message); } }
  let d;
  if (!g) { g = await fromDesc(k); d = 1; if (g) s = 'desc'; }
  gmap[k] = { g, t: now, s, d };
  console.log(k, '=>', g, s);
}
fs.mkdirSync('nyt-data', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(gmap, null, 0));
const known = keys.filter(k => gmap[k] && gmap[k].g).length;
console.log(`genret: ${known}/${keys.length} artistia`);
