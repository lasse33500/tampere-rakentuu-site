// Manse Nyt: Liigan kotiottelut Tampereella GitHub Actionsissa (27.11.2026).
// liiga.fi:n ottelurajapinnan vastaus on ~2 Mt – liian raskas Workerin ilmaistason CPU-rajalle –,
// joten haku tehdään täällä ja tulos (muutama kymmenen ottelua) tallennetaan nyt-data/liiga.json. Worker lukee tiedoston.
import fs from 'node:fs';
import { parseLiiga, SOURCES } from '../worker/index.js';
const OUT = 'nyt-data/liiga.json';
const UA = 'MansessaNyt/0.1 ( https://mansessa.fi/nyt ; lasse33500@gmail.com )';
const src = SOURCES.find(s => s.id === 'liiga');
const hki = new Date(Date.now() + 2 * 3600e3);
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' });
const season = hki.getUTCMonth() >= 6 ? hki.getUTCFullYear() + 1 : hki.getUTCFullYear();
let ev = [], ok = false;
for (const tour of ['runkosarja', 'playoffs']) {
  try {
    const r = await fetch(`https://liiga.fi/api/v2/games?tournament=${tour}&season=${season}`, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
    console.log(tour, season, r.status);
    if (!r.ok) continue;
    const got = parseLiiga(src, await r.text(), today);
    console.log(' ', got.length, 'kotiottelua Tampereella');
    ev = ev.concat(got); ok = true;
  } catch (e) { console.log(tour, 'virhe', e.message); }
}
if (!ok) { console.log('Liiga-haku epäonnistui – vanha tiedosto säilyy'); process.exit(0); }
const seen = new Set(); ev = ev.filter(e => !seen.has(e.id) && seen.add(e.id)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
fs.mkdirSync('nyt-data', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(ev));
console.log('kirjoitettu', OUT, ev.length);
