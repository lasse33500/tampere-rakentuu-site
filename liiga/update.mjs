// Manse Nyt: Liigan kotiottelut Tampereella GitHub Actionsissa (27.11.2026).
// liiga.fi:n ottelurajapinnan vastaus on ~2 Mt – liian raskas Workerin ilmaistason CPU-rajalle –,
// joten haku tehdään täällä ja tulos tallennetaan nyt-data/liiga.json. Worker lukee tiedoston.
// Diagnostiikka (HTTP-tila, koko, ottelumäärät) tallennetaan nyt-data/liiga-status.json, jotta vian näkee ilman Actions-lokeja.
import fs from 'node:fs';
import { parseLiiga, SOURCES } from '../worker/index.js';
const OUT = 'nyt-data/liiga.json', STATUS = 'nyt-data/liiga-status.json';
const UA = 'MansessaNyt/0.1 ( https://mansessa.fi/nyt ; lasse33500@gmail.com )';
const src = SOURCES.find(s => s.id === 'liiga');
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' });
const m = +today.slice(5, 7), y = +today.slice(0, 4);
const season = m >= 7 ? y + 1 : y;
const st = { run: new Date().toISOString(), today, season, tours: {} };
let ev = [], ok = false;
for (const tour of ['runkosarja', 'playoffs']) {
  if (tour === 'playoffs' && !(m >= 2 && m <= 5)) continue;
  const s = st.tours[tour] = {};
  try {
    const r = await fetch(`https://liiga.fi/api/v2/games?tournament=${tour}&season=${season}`, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
    const txt = await r.text();
    Object.assign(s, { http: r.status, type: r.headers.get('content-type'), bytes: txt.length, head: txt.slice(0, 120) });
    let arr = null; try { arr = JSON.parse(txt); } catch { s.json = 'ei JSONia'; }
    if (Array.isArray(arr)) {
      s.games = arr.length;
      s.tampere = arr.filter(g => /^tampere$/i.test(String(g?.iceRink?.city || '').trim())).length;
      const got = parseLiiga(src, arr, today);
      s.upcoming = got.length;
      ev = ev.concat(got);
      if (arr.length) ok = true;
    }
  } catch (e) { s.error = e.message; }
  console.log(tour, JSON.stringify(s));
}
fs.mkdirSync('nyt-data', { recursive: true });
fs.writeFileSync(STATUS, JSON.stringify(st, null, 1));
if (!ok) { console.log('Liiga-haku epäonnistui – vanha liiga.json säilyy'); process.exit(0); }
const seen = new Set(); ev = ev.filter(e => !seen.has(e.id) && seen.add(e.id)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
fs.writeFileSync(OUT, JSON.stringify(ev));
console.log('kirjoitettu', OUT, ev.length);
