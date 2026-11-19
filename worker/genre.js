// Genret MusicBrainzista (avoin tietokanta, tunnisteet CC0). Haetaan ajastetusti, tulokset KV:hen.
export const GENRES = ['Rock', 'Metalli', 'Punk', 'Pop', 'Rap', 'Elektroninen', 'Jazz & blues', 'Folk', 'Iskelmä', 'Klassinen', 'Lapsille'];
const MAP = [
  ['Lapsille', /children|lastenmusiikki|kids/],
  ['Klassinen', /classical|opera|orchestral|baroque|symphon|chamber music|contemporary classical|choral/],
  ['Iskelmä', /schlager|iskelmä|tango|humppa|chanson/],
  ['Metalli', /metal|grindcore|djent|metalcore/],
  ['Punk', /punk|hardcore|oi!|ska/],
  ['Rap', /hip ?hop|rap|trap|grime/],
  ['Elektroninen', /electronic|techno|house|edm|trance|synth|drum and bass|dubstep|electro|ambient|idm|breakbeat|hardstyle/],
  ['Jazz & blues', /jazz|blues|soul|funk|swing|bebop|big band|fusion/],
  ['Folk', /folk|country|americana|bluegrass|singer-songwriter|world|kansanmusiikki|reggae|latin/],
  ['Pop', /pop|r&b|disco|dance/],
  ['Rock', /rock|indie|alternative|grunge|garage|psychedel|shoegaze|post-punk|new wave/],
];
export function mapTags(tags) {
  const score = {};
  for (const t of tags) {
    const name = String(t.name || '').toLowerCase(), c = Math.max(1, t.count || 1);
    for (const [g, re] of MAP) if (re.test(name)) { score[g] = (score[g] || 0) + c; break; }
  }
  let best = null, bs = 0;
  for (const [g] of MAP) if ((score[g] || 0) > bs) { best = g; bs = score[g]; }
  return best;
}
export function artistKey(e) {
  if (!e.title) return null;
  if (/yökerho|klubi|disco|tanssit|club/i.test(e.cat || '') || /^dj[:\s]|\bdj:t\b|\bdj's\b|disco|karaoke|stand.?up|bingo|tietovisa|pikkujoulu/i.test(e.title)) return null;
  let ti = e.title.replace(/\s+@\s+.*$/, '').replace(/\b(?:presents|esittää|levynjulkaisukonsertti|levyjulkkarit|juhlakonsertti|albumikiertue|kiertue|tour)\b.*$/i, '');
  if (/^select event$|^tyk\b/i.test(ti)) return null;
  if (ti.includes(':')) { const parts = ti.split(':').map(x => x.trim()).filter(Boolean); ti = parts.length > 1 && /stage|päivähypyt|klubi|club|maanalainen|down home|afterwork|ilta|disco|kerho|salonki|festiv|vol\b|sarja|series|presents|esittää|startti|jazz|kerhon?/i.test(parts[0]) ? parts[parts.length - 1] : parts[0] || ''; }
  if (!ti) return null;
  let a = ti.split(/\s+[+&]\s+|,\s+|\s+(?:ja|feat\.?|ft\.?|with|vs\.?)\s+|\s+[–-]\s+/i)[0];
  a = a.replace(/\((?:[A-Z]{2,3}(?:\/[A-Z]{2,3})*|fi|uk|us)\)/gi, '').replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
  if (a.length < 2 || a.length > 60) return null;
  return a.toLowerCase();
}
const norm = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export async function mbGenre(name, ua) {
  const q = `artist:"${name.replace(/"/g, '')}"`;
  const r = await fetch(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(q)}&fmt=json&limit=8`, { headers: { 'User-Agent': ua, 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const want = norm(name);
  const cands = (j.artists || []).filter(a => norm(a.name) === want || (a.aliases || []).some(x => norm(x.name) === want));
  if (!cands.length) return null;
  cands.sort((a, b) => ((b.country === 'FI') - (a.country === 'FI')) || ((b.tags || []).length - (a.tags || []).length) || (b.score - a.score));
  for (const c of cands) { const g = mapTags(c.tags || []); if (g) return g; }
  return null;
}

// Varalähde: Wikidata (CC0). Haku nimellä → muusikko/yhtye → genre (P136) → luokka
const MUSIC_DESC = /yhtye|bändi|band|group|muusikko|musician|laulaja|singer|vocalist|rapper|räppäri|lauluntekijä|songwriter|dj|duo|orkesteri|orchestra|ensemble|kuoro|choir|artisti|artist|säveltäjä|composer|producer|tuottaja|kitaristi|guitarist|pianisti|pianist|rumpali|drummer|viulisti|violinist|saksofonisti|saxophonist|trio|kvartetti|quartet|basisti|bassist/i;
export async function wdGenre(name, ua, dbg) {
  const h = { 'User-Agent': ua, 'Accept': 'application/json' };
  const api = 'https://www.wikidata.org/w/api.php?format=json&origin=*&';
  const sr = await fetch(api + 'action=wbsearchentities&type=item&limit=7&language=en&uselang=fi&strictlanguage=0&search=' + encodeURIComponent(name), { headers: h });
  if (!sr.ok) throw new Error('WD ' + sr.status);
  const sj = await sr.json();
  const want = norm(name);
  if (dbg) dbg.search = (sj.search || []).map(x => [x.id, x.label, x.description, x.match && x.match.text]);
  const cands = (sj.search || []).filter(x => (norm(x.label || '') === want || norm((x.match && x.match.text) || '') === want) && MUSIC_DESC.test(x.description || ''));
  if (!cands.length) return null;
  const er = await fetch(api + 'action=wbgetentities&props=claims&ids=' + cands.slice(0, 3).map(c => c.id).join('|'), { headers: h });
  if (!er.ok) throw new Error('WD ' + er.status);
  const ej = await er.json();
  const gids = [];
  for (const c of cands.slice(0, 3)) {
    const cl = (ej.entities[c.id] || {}).claims || {};
    for (const st of cl.P136 || []) { const id = st.mainsnak && st.mainsnak.datavalue && st.mainsnak.datavalue.value.id; if (id) gids.push(id); }
    if (gids.length) break;
  }
  if (dbg) dbg.gids = gids;
  if (!gids.length) return null;
  const lr = await fetch(api + 'action=wbgetentities&props=labels&languages=en|fi&languagefallback=1&ids=' + [...new Set(gids)].slice(0, 20).join('|'), { headers: h });
  if (!lr.ok) throw new Error('WD ' + lr.status);
  const lj = await lr.json();
  if (dbg) dbg.raw = JSON.stringify(lj).slice(0, 300);
  const tags = Object.values(lj.entities || {}).map(e => ({ name: ((e.labels || {}).en || (e.labels || {}).fi || Object.values(e.labels || {})[0] || {}).value || '', count: 1 }));
  if (dbg) dbg.tags = tags.map(t => t.name);
  return mapTags(tags);
}

// Genre tapahtumapaikan oman tapahtumasivun esittelytekstistä (vain avainsanat, tekstiä ei tallenneta)
const DESC = [
  ['Lapsille', /lastenmusiik|lastenkonsert|perhekonsert|koko perheen konsert/g],
  ['Klassinen', /sinfoni|kamarimusiik|ooppera|klassisen musiikin|filharmon/g],
  ['Iskelmä', /iskelm|tango|humppa/g],
  ['Metalli', /metalli|\bmetal\b|metalcore|thrash|death metal|black metal|doom/g],
  ['Punk', /punk|hardcore/g],
  ['Rap', /\bräp|\brap\b|räppä|hip ?hop/g],
  ['Elektroninen', /elektroni|techno|tekno\b|\bhouse\b|\bedm\b|syntikkapop|synthpop/g],
  ['Jazz & blues', /jazz|blues|\bsoul\b|\bfunk|big band/g],
  ['Folk', /\bfolk|kansanmusiik|\bcountry|americana|laulaja-lauluntekijä|reggae/g],
  ['Pop', /\bpop\b|\bpopin|\bpoppi|popyhtye|poptähti|popartisti/g],
  ['Rock', /rock|proge|progressiivi|\bindie|grunge/g],
];
export function descGenre(html) {
  const ps = [...String(html).replace(/<(script|style|nav|header|footer)[\s\S]*?<\/\1>/gi, ' ').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => m[1].replace(/<[^>]*>/g, ' ')).join(' ').toLowerCase();
  if (ps.length < 80) return null;
  let best = null, bs = 0;
  for (const [g, re] of DESC) { const n = (ps.match(re) || []).length; if (n > bs) { best = g; bs = n; } }
  return best;
}
