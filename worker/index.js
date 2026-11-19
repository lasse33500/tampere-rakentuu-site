// Manse nyt – mansessa.fi/nyt
// Sama Worker ("mansessa") palvelee historiasivuston staattiset tiedostot (assets) ja /nyt-polut.
// Tapahtumista näytetään vain faktat (nimi, aika, paikka, hinta, ikäraja) ja linkki alkuperäiseen sivuun.
import { PAGE } from './page.js';
import { artistKey, mbGenre, wdGenre, descGenre } from './genre.js';

const SPORT_RE = () => /liiga|runkosarja|ottelu|salibandy|floorball|jääkiekko|hockey|\bWFC\b|MM-kilpailut|playoff|pudotuspeli/i;
export const SOURCES = [
  { id: 'tullikamari', name: 'Tullikamari', site: 'https://tullikamari.fi', path: '/ohjelma/',
    link: /^https?:\/\/(?:www\.)?tullikamari\.fi\/tapahtumat\/[^?#]*?(\d{1,2})-(\d{1,2})-(\d{4})(?:-\d+)?\/?$/,
    venue: t => /Pakkahuone/i.test(t) ? 'Pakkahuone' : /Klubi/i.test(t) ? 'Tullikamarin Klubi' : 'Tullikamari',
    addr: 'Tullikamarin aukio 2' },
  { id: 'tavara-asema', name: 'Tavara-asema', site: 'https://tavara-asema.fi', path: '/ohjelma/',
    link: /^https?:\/\/(?:www\.)?tavara-asema\.fi\/ohjelma\/[^?#]*?(\d{1,2})-(\d{1,2})-(\d{4})(?:-\d+)?\/?$/,
    venue: t => /Rataklubi/i.test(t) ? 'Tavara-asema, Rataklubi' : 'Tavara-asema',
    addr: 'Ratapihankatu 33' },
  { id: 'glivelab', name: 'G Livelab', site: 'https://glivelab.fi', path: '/tampere/',
    link: /^https?:\/\/(?:www\.)?glivelab\.fi\/tampere\/events\/[^?#]+-[0-9a-f]{24}\/?$/, dateFrom: 'text',
    venue: () => 'G Livelab', addr: 'Puutarhakatu 1' },
  { id: 'nokia-arena', name: 'Nokia Arena', site: 'https://nokiaarena.fi', path: '/en/events/',
    link: /^https?:\/\/(?:www\.)?lippu\.fi\/event\/[^?#]+/, dateFrom: 'text', group: 'container',
    perLink: SPORT_RE(),
    venue: () => 'Nokia Arena', addr: 'Kansikatu 3' },
  { id: 'telakka', name: 'Telakka', site: 'https://www.telakka.eu', path: '/ohjelma/', mode: 'text',
    dateLine: /^(?:ma|ti|ke|to|pe|la|su)\.?\s+(\d{1,2})\.(\d{1,2})\.?$/i,
    venue: () => 'Telakka', addr: 'Tullikamarin aukio 3' },
  { id: 'bar-k', name: 'Bar K', site: 'https://www.bar-k.fi', path: '/tapahtumat', mode: 'squarespace', pub: true,
    venue: () => 'Bar K', addr: 'Kauppakatu 11' },
  { id: 'kujakolli', name: 'Pub Kujakolli', site: 'https://kujakolli.fi', path: '/', mode: 'text', pub: true,
    after: /tulevia keikkoja/i,
    dateLine: /^(\d{1,2})\.(\d{1,2})\.?\s+(?<t>[^\d\s].{1,100})$/,
    start: '22:00', free: true, // sivulla: showtime 22, vapaa pääsy
    venue: () => 'Pub Kujakolli', addr: 'Tahmelan viertotie 2' },
  { id: 'pub-simon', name: 'Pub Simon', site: 'https://www.pubsimon.fi', path: '/tapahtumat', mode: 'squarespace', pub: true,
    venue: () => 'Pub Simon', addr: 'Hämeenkatu 26' },
  { id: 'maanalainen', name: 'Maanalainen', site: 'https://maanalainen.net', path: '/tapahtumat/', mode: 'text',
    dateLine: /^(\d{1,2})\.(\d{1,2})\.\s*(?<t>[^\d\s].{1,160})$/,
    venue: () => 'Maanalainen', addr: 'Itsenäisyydenkatu 2' },
  { id: 'tampere-talo', name: 'Tampere-talo', site: 'https://www.tampere-talo.fi', path: '/wp-json/events/v1/feed', mode: 'ttfeed',
    venue: () => 'Tampere-talo', addr: 'Yliopistonkatu 55' },
  { id: 'komediateatteri', name: 'Tampereen Komediateatteri', site: 'https://www.komediateatteri.fi', path: '/24/ohjelmisto', mode: 'komedia',
    addr: 'Lapintie 3a' },
  { id: 'bar-kotelo', name: 'Bar Kotelo', site: 'https://barkotelo.fi', path: '/keikat/', mode: 'text',
    dateLine: /^(?:(?:ma|ti|ke|to|pe|la|su)\.?\s+)?(\d{1,2})\.(\d{1,2})\.(20\d\d)$/i,
    venue: () => 'Bar Kotelo', addr: 'Sammonkatu 50' },
];
export const VERSION = '2026-11-19w';
const UA = 'MansessaNyt/0.1 (+https://mansessa.fi/nyt; tapahtumakooste, haku kerran 3 tunnissa)';
const MB_UA = 'MansessaNyt/0.1 ( https://mansessa.fi/nyt ; lasse33500@gmail.com )';
const TTL = 3 * 3600;
const GENERIC = /^(lue lisää|lisätietoja|liput|osta liput|osta lippu|read more|buy tickets|tickets|loppuunmyyty|sold out|›|→|»)$/i;

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', euro: '€', auml: 'ä', ouml: 'ö', aring: 'å', Auml: 'Ä', Ouml: 'Ö', Aring: 'Å', eacute: 'é', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };
export function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[e] ?? m;
  });
}
const clean = s => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// HTML → tekstirivit, joissa linkit merkitty: \u0001URL\u0002teksti\u0003
export function linearize(html, base) {
  html = html.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|head)[\s\S]*?<\/\1>/gi, ' ');
  html = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs, inner) => {
    const h = /href\s*=\s*["']([^"']+)["']/i.exec(attrs);
    let url = h ? decode(h[1]) : '';
    try { url = new URL(url, base).href; } catch { url = ''; }
    return `\u0001${url}\u0002${clean(inner)}\u0003`;
  });
  html = html.replace(/<(br|\/p|\/div|\/li|\/h\d|\/span|\/time|li|p|div|h\d|article|\/article|section|\/section|tr|\/tr|td|\/td|dt|dd)\b[^>]*>/gi, '\n');
  html = html.replace(/<[^>]*>/g, ' ');
  return decode(html).replace(/[ \t\r\f\v]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n');
}

export function textDate(t, today) {
  const m = /(?:^|[^\d])(\d{1,2})\.(\d{1,2})\.(?:\s*(20\d\d))?/.exec(t);
  if (!m) return null;
  const dd = +m[1], mm = +m[2]; if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
  let y = m[3] ? +m[3] : +today.slice(0, 4);
  let iso = `${y}-${pad(mm)}-${pad(dd)}`;
  if (!m[3] && iso < shiftDays(today, -60)) iso = `${y + 1}-${pad(mm)}-${pad(dd)}`;
  return iso;
}
function shiftDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function pad(n) { return String(n).padStart(2, '0'); }

export function parseCard(src, url, date, text, titles) {
  const t = text.replace(/\u0001[^\u0002]*\u0002([^\u0003]*)\u0003/g, '$1');
  const lines = t.split('\n').map(x => x.trim()).filter(Boolean);
  const DATEISH = /^(?:(?:ma|ti|ke|to|pe|la|su)\.?\s*)?\d{1,2}\s*[./]\s*\d{1,2}(?:\s*[./]\s*(?:\d{4})?)?\.?$/i;
  const NOTTITLE = /^(?:ma|ti|ke|to|pe|la|su)\.?$|^(?:ovet|alk|ovelta|liput|lue lisää|lisätietoja|loppuunmyyty|sold out|osta|k-?\d\d|s\s*\/|klo\b)|€|^(?:klubi|pakkahuone|tavara-asema|rataklubi|tullikamari)$|^\d{1,2}[:.]\d{2}(?:\s*[–-]\s*\d{1,2}[:.]\d{2})?$/i;
  const ok = x => x && x.length > 1 && !GENERIC.test(x) && !DATEISH.test(x) && !NOTTITLE.test(x);
  let title = titles.filter(ok).sort((a, b) => b.length - a.length)[0] || '';
  if (!title) title = lines.find(ok) || '';
  let doors = null, start = null;
  const dm = /Ovet(?:\s*klo)?\s*:?\s*(\d{1,2})[:.](\d{2})/i.exec(t);
  if (dm) doors = `${pad(dm[1])}:${dm[2]}`;
  const tt = t.replace(/Ovet(?:\s*klo)?\s*:?\s*\d{1,2}[:.]\d{2}(?:\s*[–-]\s*\d{1,2}[:.]\d{2})?/gi, ' ')
             .replace(/\(?(?:lämppäri|support|esiintyy)[^)\n]*\)?/gi, ' ');
  const sm = /klo\s*([01]?\d|2[0-3])[:.]([0-5]\d)/i.exec(tt) || /(?:^|[^\d.:/])([01]?\d|2[0-3]):([0-5]\d)(?![\d€])/.exec(tt);
  if (sm) start = `${pad(sm[1])}:${sm[2]}`;
  const num = s => s ? parseFloat(s.replace(',', '.')) : null;
  const pf = /alk\.?\s*(\d+(?:[,.]\d{1,2})?)\s*€/i.exec(t) || /(\d+(?:[,.]\d{1,2})?)\s*€/.exec(t);
  const pd = /Ovelta\s*:?\s*(\d+(?:[,.]\d{1,2})?)\s*€/i.exec(t);
  const age = (/(?:^|[\s(])(S\s*\/\s*K-?18|K-?18\s*\/\s*S|K-?18|K-?20|K-?16)(?=[\s),]|$)/i.exec(t) || [])[1];
  title = title.replace(/\b\d{1,2}\.\d{1,2}\.(?:\s*20\d\d)?/g, ' ').replace(/\b(?:ma|ti|ke|to|pe|la|su|mon|tue|wed|thu|fri|sat|sun)\b\.?/gi, ' ').replace(/osta liput|loppuunmyyty|sold out|buy tickets/gi, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\s*(?:klo\s*)?\b([01]?\d|2[0-3])[:.][0-5]\d\s*$/, '').replace(/^(?:klo\s*)?([01]?\d|2[0-3])[:.][0-5]\d\s+/, '').replace(/\s+/g, ' ').trim();
  return {
    id: src.id + ':' + url.replace(/^https?:\/\/[^/]+/, ''),
    title, date, start, doors,
    venue: src.venue(t), place: src.name, addr: src.addr,
    price: num(pf && pf[1]), door: num(pd && pd[1]),
    free: /vapaa pääsy|maksuton|ilmainen/i.test(t),
    soldout: /loppuunmyyty|sold out/i.test(t),
    age: age ? age.replace(/\s/g, '').toUpperCase() : null,
    url, source: src.name,
  };
}

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr','param']);
// Kevyt elementtipuu: jokaiselle elementille [alku, loppu, vanhempi]
export function elementTree(html) {
  const nodes = [{ tag: '#root', s: 0, e: html.length, p: -1 }], stack = [0];
  const re = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g; let m;
  while ((m = re.exec(html))) {
    const tag = m[2].toLowerCase();
    if (m[1]) { // sulkeva
      for (let k = stack.length - 1; k > 0; k--) if (nodes[stack[k]].tag === tag) { for (let j = stack.length - 1; j >= k; j--) nodes[stack[j]].e = re.lastIndex; stack.length = k; break; }
    } else if (!VOID.has(tag) && !m[3]) {
      nodes.push({ tag, s: m.index, e: html.length, p: stack[stack.length - 1] }); stack.push(nodes.length - 1);
      if (tag === 'script' || tag === 'style') { const end = html.toLowerCase().indexOf('</' + tag, re.lastIndex); if (end > 0) re.lastIndex = end; }
    }
  }
  return nodes;
}


const CAT = { 'yokerho': 'Yökerho', 'konsertti-keikka': 'Keikka', 'klubi': 'Klubi', 'klubit': 'Klubi', 'tanssit': 'Tanssit', 'stand-up': 'Stand up', 'teatteri': 'Teatteri', 'muu-julkinen-tapahtuma': 'Muu tapahtuma', 'festivaali': 'Festivaali', 'disco': 'Disco' };
function byClass(h, tag, cls) {
  const all = byClassAll(h, tag, cls); return all.length ? all.join(' ') : null;
}
function byClassAll(h, tag, cls) {
  const re = new RegExp(`<${tag}\\b[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>([\\s\\S]*?)</${tag}>`, 'gi'); const out = []; let m;
  while ((m = re.exec(h))) out.push(m[1]);
  return out;
}
// Tullikamarin ja Tavara-aseman WordPress-teema: article.event-feed-item, h2.event-title, h2.event-artist (+span aika), li.event-venue
export function structured(ev, h) {
  const arts = byClassAll(h, 'h[1-6]', 'event-artist'), tit = byClass(h, 'h[1-6]', 'event-title');
  const art = arts.length ? arts.join('\u0004') : null;
  if (art == null && tit == null) return ev;
  let start = null;
  const artist = art != null ? clean(art.replace(/<span\b[^>]*>([\s\S]*?)<\/span>/gi, (m, x) => { const t = /([01]?\d|2[0-3])[:.]([0-5]\d)/.exec(clean(x)); if (t) { start = `${t[1].padStart(2, '0')}:${t[2]}`; return ' '; } return m; })) : '';
  const etitle = tit != null ? clean(tit) : '';
  const artistJ = artist.split('\u0004').map(x => x.trim()).filter(Boolean).join(', ');
  if (etitle && artistJ) {
    if (/:\s*$/.test(etitle)) { ev.title = etitle + ' ' + artistJ; ev.sub = null; }
    else { ev.title = artistJ; ev.sub = etitle; }
  } else ev.title = (artistJ || etitle);
  ev.title = ev.title.replace(/\s*:\s*$/, '').replace(/\s+/g, ' ').trim();
  if (start) ev.start = start;
  const v = byClass(h, 'li', 'event-venue'); if (v && clean(v)) ev.venue = ev.place === 'Tullikamari' ? (/^klubi$/i.test(clean(v)) ? 'Tullikamarin Klubi' : clean(v)) : ev.venue;
  const c = /event_category-([a-z0-9-]+)/.exec(h);
  if (c) ev.cat = CAT[c[1]] || c[1].replace(/-/g, ' ').replace(/^./, x => x.toUpperCase());
  return ev;
}

// Lähteet, joissa ohjelma on vapaata tekstiä: päivärivi aloittaa lohkon
export function parseTextBlocks(src, html, debug = false) {
  const base = src.site + src.path, today = todayHelsinki();
  const lin = linearize(html, base);
  const lines = lin.split('\n').map(l => l.trim()).filter(Boolean);
  const out = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const L = cur.lines;
    const links = []; const text = L.map(l => l.replace(/\u0001([^\u0002]*)\u0002([^\u0003]*)\u0003/g, (m, u, t) => { links.push(u); return t; })).filter(Boolean);
    const isMeta = l => /^(?:klo|keikat|ovet|liput|vapaa pääsy|loppuunmyyty|k-?1[68]|k-?20|s\b|\(.*\)$)|€/i.test(l);
    const titleLines = cur.inline ? [text[0].replace(/\s*\([^)]*€[^)]*\)\s*$/, '').replace(/\s*[–-]\s*$/, '')] : []; if (!cur.inline) for (const l of text) { if (isMeta(l)) break; if (l.length > 1 && !/^osta liput|^lue lisää/i.test(l)) titleLines.push(l); if (titleLines.length >= 4) break; }
    const tc = l => (l === l.toUpperCase() && /[A-ZÅÄÖ]{3}/.test(l)) ? l.toLowerCase().replace(/(^|[\s(\-/&+.'])([a-zåäöü])/g, (m, a, b) => a + b.toUpperCase()).replace(/\((\w{2,3})\)/g, (m, x) => '(' + x.toUpperCase() + ')') : l;
    let title = titleLines.map(tc).join(', ').replace(/\s+/g, ' ').trim();
    if (title.length > 160) title = title.slice(0, 157) + '…';
    const t = text.join('\n');
    const tm = /(?:klo|keikat:?\s*klo)\s*(\d{1,2})(?:[.:](\d{2}))?/i.exec(t);
    const dm = /ovet:?\s*(?:klo\s*)?(\d{1,2})[.:](\d{2})/i.exec(t);
    const pm = /(\d+(?:[,.]\d{1,2})?)\s*(?:\/\s*\d+(?:[,.]\d{1,2})?)?\s*€/.exec(t);
    const tix = links.find(u => /tiketti\.fi|lippu\.fi|kide\.app|liveto|ticketmaster/i.test(u));
    const ev = {
      id: src.id + ':' + cur.date + ':' + title.slice(0, 40), title, date: cur.date,
      start: cur.inline ? src.start || null : tm ? `${pad(tm[1])}:${tm[2] || '00'}` : null, doors: dm ? `${pad(dm[1])}:${dm[2]}` : null,
      venue: src.venue(t), place: src.name, addr: src.addr,
      price: pm ? parseFloat(pm[1].replace(',', '.')) : null, door: null,
      free: !!src.free || /vapaa pääsy|maksuton|ilmainen/i.test(t), soldout: /loppuunmyyty|sold out/i.test(t),
      age: (/(?:^|[\s(])(K-?18|K-?20|S\s*\/\s*K-?18)(?=[\s),]|$)/i.exec(t) || [])[1] || null,
      url: tix || base, source: src.name, cat: src.pub ? 'Pubikeikka' : /klubi|disco|dj\b/i.test(title) ? 'Klubi' : 'Keikka',
    };
    if (debug) ev._txt = t.slice(0, 400);
    if (title && ev.date >= shiftDays(today, -1)) out.push(ev);
  };
  let started = !src.after;
  for (const l of lines) {
    const plain = l.replace(/\u0001[^\u0002]*\u0002([^\u0003]*)\u0003/g, '$1').trim();
    if (!started) { started = src.after.test(plain); continue; }
    const m = src.dateLine.exec(plain);
    if (m && m.groups && m.groups.t) {
      flush();
      const dd = +m[1], mm = +m[2];
      const date = dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 ? textDate(`${dd}.${mm}.`, today) : null;
      cur = date ? { date, lines: [m.groups.t.trim()], inline: true } : null;
      continue;
    }
    if (m) {
      flush();
      let date;
      if (m[3]) date = `${m[3]}-${pad(m[2])}-${pad(m[1])}`; else date = textDate(`${m[1]}.${m[2]}.`, today);
      cur = date ? { date, lines: [] } : null;
      continue;
    }
    if (cur) { cur.lines.push(l); if (cur.lines.length > 25) { flush(); cur = null; } }
  }
  flush();
  return out;
}

export function parseListing(src, html, debug = false) {
  html = html.replace(/<!--[\s\S]*?-->/g, m => ' '.repeat(m.length));
  const base = src.site + src.path;
  const nodes = elementTree(html);
  const anchors = []; // {node, url, d, text}
  nodes.forEach((n, i) => {
    if (n.tag !== 'a') return;
    const open = html.slice(n.s, html.indexOf('>', n.s) + 1);
    const h = /href\s*=\s*["']([^"']+)["']/i.exec(open); if (!h) return;
    let u; try { u = new URL(decode(h[1]), base).href; } catch { return; }
    const d = src.link.exec(u); if (!d) return;
    anchors.push({ i, url: u.includes('?') ? u : u.replace(/\/?$/, '/'), d, text: clean(html.slice(n.s, n.e)) });
  });
  const today = todayHelsinki();
  const containsOther = (n, url) => anchors.some(a => a.url !== url && nodes[a.i].s >= n.s && nodes[a.i].e <= n.e);
  const groups = new Map(); // avain → {url, list, node}
  for (const a of anchors) {
    let key, node;
    if (src.group === 'container') {
      // nouse kunnes elementissä on otsikko ja päivämäärä
      let cur = a.i;
      while (nodes[cur].p > 0) {
        const h = html.slice(nodes[cur].s, nodes[cur].e);
        if (/<h[1-6]\b/i.test(h) && /\b\d{1,2}\.\d{1,2}\./.test(clean(h))) break;
        const par = nodes[nodes[cur].p];
        if (['body', 'html', 'main'].includes(par.tag) || par.e - par.s > 30000) break;
        cur = nodes[cur].p;
      }
      key = 'n' + cur; node = cur;
    } else key = a.url;
    if (!groups.has(key)) groups.set(key, { url: a.url, list: [], node });
    groups.get(key).list.push(a);
  }
  const out = [];
  for (const [, g] of groups) {
    let best = g.node;
    if (best == null) {
      // nouse ensimmäisestä linkistä ylöspäin niin kauan kuin elementti ei sisällä muiden tapahtumien linkkejä
      let cur = g.list[0].i; best = cur;
      while (nodes[cur].p > 0) {
        const par = nodes[nodes[cur].p];
        if (['body', 'html', 'main'].includes(par.tag) || containsOther(par, g.url) || par.e - par.s > 20000) break;
        cur = nodes[cur].p; best = cur;
      }
    }
    const n = nodes[best];
    const chunk = html.slice(n.s, n.e);
    const text = linearize(chunk, base);
    let date = null;
    const d = g.list[0].d;
    if (src.dateFrom !== 'text' && d && d[3]) date = `${d[3]}-${pad(d[2])}-${pad(d[1])}`;
    else date = textDate(text.replace(/[\u0001-\u0003]/g, ' '), today);
    if (!date) continue;
    const heads = [...chunk.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map(m => clean(m[1])).filter(Boolean);
    const ev = parseCard(src, g.url, date, text, heads.length ? heads : g.list.map(a => a.text));
    structured(ev, chunk);
    if (src.skip && src.skip.test(ev.title + ' ' + g.url)) continue;
    if (src.perLink && src.perLink.test(ev.title + ' ' + g.url)) {
      // sarjakortti (Liiga, MM-kisat): tekstissä rivejä "|URL|pp.kk.vvvv Koti – Vieras|" – jokainen oma ottelunsa
      const games = [...text.matchAll(/\u0001?(https?:[^\u0001-\u0003|\s]+)[\u0001-\u0003|]+\s*(\d{1,2})\.(\d{1,2})\.(20\d\d)\s+([^\u0001-\u0003|\n]{3,80})/g)];
      const seen = new Set();
      for (const m of games) {
        const dt = `${m[4]}-${pad(m[3])}-${pad(m[2])}`;
        if (dt < today || seen.has(m[1])) continue; seen.add(m[1]);
        const name = m[5].trim();
        out.push(Object.assign({}, ev, { id: src.id + ':' + m[1], url: m[1], date: dt, start: null, title: name, sub: null, kind: 'Urheilu' }));
      }
      if (seen.size) continue;
      if (/^select event$/i.test(ev.title)) ev.title = heads.find(h => !/^select event$/i.test(h)) || ev.title;
    }
    if (src.perLink && src.perLink.test(ev.title) && g.list.length > 1) {
      // sarjakortti (esim. Liiga): jokainen lippulinkki on oma ottelunsa, päivä linkin tekstistä tai sen ympäriltä
      for (const a of g.list) {
        let dt = textDate(a.text, today);
        if (!dt) { const par = nodes[nodes[a.i].p]; dt = textDate(clean(html.slice(par.s, par.e)), today); }
        if (!dt) continue;
        const tm = /([01]?\d|2[0-3])[:.]([0-5]\d)/.exec(a.text);
        out.push(Object.assign({}, ev, { id: src.id + ':' + a.url, url: a.url, date: dt, start: tm ? `${pad(tm[1])}:${tm[2]}` : null, sub: clean(a.text).slice(0, 80) }));
      }
      continue;
    }
    if (debug) { ev._txt = text.replace(/[\u0001-\u0003]/g, '|').slice(0, 600); ev._html = chunk.replace(/<(img|svg|source|picture)\b[^>]*>/gi, '').replace(/\s(?!class=)[\w:-]+=("[^"]*"|'[^']*')/g, '').replace(/\s+/g, ' ').slice(0, 900); }
    out.push(ev);
  }
  return out;
}

// Squarespace-tapahtumalista (Bar K): HTML (article.eventlist-event); JSON-haara vain testejä varten
const hkiParts = ms => { const f = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)); return { date: f.slice(0, 10), time: f.slice(11, 16) }; };
const sqTitle = t => clean(t).replace(/^(?:ma|ti|ke|to|pe|la|su)\.?\s+\d{1,2}\.\d{1,2}\.?(?:\s*[–-]\s*\d{1,2}\.\d{1,2}\.?)?\s*/i, '')
  .replace(/^(.*)$/, x => (x === x.toUpperCase() && /[A-ZÅÄÖ]{3}/.test(x)) ? x.toLowerCase().replace(/(^|[\s(\-/&+.'])([a-zåäöü])/g, (m, a, b) => a + b.toUpperCase()) : x);
export function parseSquarespace(src, body, debug = false) {
  const today = todayHelsinki(), out = [];
  const mk = (title, date, start, url) => {
    title = sqTitle(title);
    if (!title || !date || date < today) return;
    out.push({ id: src.id + ':' + url, title, date, start, doors: null, venue: src.venue(title), place: src.name, addr: src.addr,
      price: null, door: null, free: false, soldout: false, age: null, url, source: src.name, cat: src.pub ? 'Pubikeikka' : 'Keikka' });
  };
  let j = null; try { j = JSON.parse(body); } catch {}
  if (j) {
    for (const it of [...(j.upcoming || []), ...(j.items || [])]) {
      if (!it || !it.startDate) continue;
      const p = hkiParts(it.startDate);
      mk(it.title || '', p.date, p.time, new URL(it.fullUrl || src.path, src.site).href);
    }
  } else {
    for (const ch of String(body).split(/<article\b(?=[^>]*eventlist-event)/i).slice(1)) {
      const a = /class="[^"]*eventlist-title[^"]*"[\s\S]*?<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(ch);
      const d = /datetime="(20\d\d-\d\d-\d\d)"/i.exec(ch);
      const t = /event-time-24hr[^>]*>\s*(\d{1,2}:\d{2})/i.exec(ch);
      if (a && d) mk(a[2], d[1], t ? (t[1].length === 4 ? '0' + t[1] : t[1]) : null, new URL(decode(a[1]), src.site).href);
    }
  }
  const seen = new Set();
  return out.filter(e => !seen.has(e.id) && seen.add(e.id));
}

// Tampere-talon WordPress-syöte (events/v1/feed): id, title, description, start_date. Kuvausta ei tallenneta,
// siitä päätellään vain tyyppi ja genre. Linkki ?p=<id> ohjaa tapahtumasivulle.
export function parseTTFeed(src, body) {
  const today = todayHelsinki(), out = [];
  let j; try { j = JSON.parse(body); } catch { return out; }
  for (const it of (j && j.events) || []) {
    const m = /^(20\d\d-\d\d-\d\d)[ T](\d\d):(\d\d)/.exec(it.start_date || '');
    if (!m || m[1] < today || !it.title) continue;
    const title = clean(decode(String(it.title)));
    const d = clean(decode(String(it.description || '').replace(/<[^>]*>/g, ' '))).toLowerCase();
    let cat = 'Konsertti';
    if (/näyttely|messut|seminaari|kongressi|konferenssi|rekrytointi|ura\b|luento|myyjäiset|lounas|brunssi|esittäytyy|kirjafestar|tanssiaiset|messu\b/.test(d + ' ' + title.toLowerCase())) cat = 'Muu tapahtuma';
    else if (/baletti|tanssiteos|tanssiesitys|teatteri|näytelmä|musikaali|ooppera|stand ?up|komiikka|sirkus|esitys/.test(d + ' ' + title.toLowerCase())) cat = 'Teatteri';
    const ev = { id: src.id + ':' + it.id + ':' + m[1] + m[2] + m[3], title, date: m[1], start: `${m[2]}:${m[3]}`, doors: null,
      venue: 'Tampere-talo', place: src.name, addr: src.addr, price: null, door: null, free: /vapaa pääsy|maksuton|ilmainen/.test(d),
      soldout: /loppuunmyyty/.test(d), age: null, url: `${src.site}/?p=${it.id}`, source: src.name, cat };
    if (cat === 'Konsertti') { const g = descGenre('<p>' + d + '</p>', 5); if (g) ev.genre = g; }
    out.push(ev);
  }
  // näyttelyt ym. toistuvat lähes joka päivä: jos sama nimi ≥ 5 kertaa (tai Muu ≥ 2), näytetään vain ensimmäinen
  const cnt = {}; for (const e of out) cnt[e.title] = (cnt[e.title] || 0) + 1;
  const seen = new Set();
  return out.filter(e => {
    const rep = cnt[e.title] >= 5 || (e.cat === 'Muu tapahtuma' && cnt[e.title] >= 2);
    if (!rep) return true;
    if (seen.has(e.title)) return false;
    seen.add(e.title); if (cnt[e.title] >= 5) { e.cat = 'Muu tapahtuma'; e.sub = 'Useana päivänä'; delete e.genre; }
    return true;
  });
}

// Tampereen Komediateatteri: ohjelmistokortit (div.show_serie_card), joissa esityssarjan seuraava näytös.
// Täysi päivä vuosineen napin aria-labelista "Osta liput näytökseen X 21.11.2026 klo 14.00".
export function parseKomedia(src, html) {
  const today = todayHelsinki(), out = [];
  for (const ch of String(html).split(/<div\s+class="show_serie_card/i).slice(1)) {
    const a = /class="title"[^>]*>\s*<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(ch);
    if (!a) continue;
    const title = clean(decode(a[2]));
    let date = null, start = null;
    const al = /aria-label="[^"]*?(\d{1,2})\.(\d{1,2})\.(20\d\d)\s+klo\s+(\d{1,2})[.:](\d{2})"/i.exec(ch);
    if (al) { date = `${al[3]}-${pad(al[2])}-${pad(al[1])}`; start = `${pad(al[4])}:${al[5]}`; }
    else {
      const d = /class="date"[^>]*>([^<]*)</i.exec(ch), t = /class="time"[^>]*>[^<\d]*(\d{1,2})[.:](\d{2})/i.exec(ch);
      if (d) date = textDate(d[1], today); if (t) start = `${pad(t[1])}:${t[2]}`;
    }
    if (!date || date < today) continue;
    const stage = clean(decode((/class="venue"[\s\S]*?<span>([^<]*)<\/span>/i.exec(ch) || [])[1] || ''));
    const palatsi = /palatsi/i.test(stage);
    const tix = (/class="proceed"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="proceed"/i.exec(ch) || []);
    const cat = /konsertti|big band|jazz|joulun hetki|festival|orkesteri|kuoro/i.test(title) && !/stand ?up|show k18/i.test(title) ? 'Konsertti' : 'Teatteri';
    out.push({ id: src.id + ':' + a[1], title, sub: 'Seuraava näytös' + (stage && !palatsi ? ' · ' + stage : ''), date, start, doors: null,
      venue: palatsi ? 'Komediateatterin Palatsi' : 'Tampereen Komediateatteri', place: src.name, addr: palatsi ? 'Hämeenkatu 30' : src.addr,
      price: null, door: null, free: false, soldout: /loppuunmyyty|sold_out|soldout/i.test(ch.replace(/class="available"[\s\S]*$/i, '')) && !/class="available"/i.test(ch),
      age: /\bK-?18\b/i.test(title) ? 'K18' : null, url: decode(a[1]), tickets: decode(tix[1] || tix[2] || '') || null, source: src.name, cat });
  }
  return out;
}

async function robotsAllows(src, ctx) {
  try {
    const r = await cachedFetch(src.site + '/robots.txt', ctx, 24 * 3600);
    if (!r.ok) return true;
    const txt = await r.text();
    let applies = false; const dis = [];
    for (const line of txt.split('\n')) {
      const [k, ...v] = line.split(':'); const val = v.join(':').trim();
      if (/^user-agent$/i.test(k.trim())) applies = val === '*' || /mansessa/i.test(val);
      else if (applies && /^disallow$/i.test(k.trim()) && val) dis.push(val);
    }
    const rx = p => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    return !dis.some(p => rx(p).test(src.path));
  } catch { return true; }
}

// Ei Cache API:a: haku tehdään vain kerran vuorokaudessa, ja välimuistikutsut kuluttaisivat Workers-ilmaistason 50 alipyynnön kiintiötä
async function cachedFetch(url, ctx, ttl = TTL) {
  return fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' }, cf: { cacheTtl: ttl } });
}

// Pääkategoria: Keikka · Klubi · Teatteri · Urheilu · Muu
const SPORT = /liiga|runkosarja|ottelu|salibandy|floorball|jääkiekko|hockey|\bWFC\b|MM-kilpailut|playoff|pudotuspeli|koripallo|lentopallo|futsal/i;
export function classify(e) {
  const t = (e.title || '') + ' ' + (e.sub || '') + ' ' + (e.cat || '');
  let k = 'Keikka';
  if (e.kind === 'Urheilu' || SPORT.test(t + ' ' + (e.url || ''))) k = 'Urheilu';
  else if (/teatteri|näytelmä|ooppera|baletti|musikaali|stand ?up|komiikka|improvisaatio/i.test(t)) k = 'Teatteri';
  else if (/muu tapahtuma|sarjakuva|salonki|markkinat|messut|luento|keskustelu|tietovisa|visailu|viihdevisa|pubivisa|\bvisa\b|bingo|työpaja/i.test(t)) k = 'Muu';
  else if (/yökerho|klubi|club|disco|\bdj\b|dj:t|dj's|dj:s|tanssit|karaoke|pubikeikka/i.test(t)) k = 'Klubi';
  e.kind = k;
  if (k !== 'Keikka') delete e.genre;
  return e;
}
function todayHelsinki() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Helsinki' }).format(new Date());
}

export async function collect(ctx, debug = false) {
  const today = todayHelsinki();
  const status = {};
  const lists = await Promise.all(SOURCES.map(async src => {
    try {
      if (!(await robotsAllows(src, ctx))) { status[src.id] = 'robots.txt kieltää'; return []; }
      if (src.mode === 'komedia') {
        const r = await cachedFetch(src.site + src.path, ctx);
        if (!r.ok) { status[src.id] = 'HTTP ' + r.status; return []; }
        const ev = parseKomedia(src, await r.text()); status[src.id] = ev.length; return ev;
      }
      if (src.mode === 'ttfeed') {
        const r = await cachedFetch(src.site + src.path, ctx);
        if (!r.ok) { status[src.id] = 'HTTP ' + r.status; return []; }
        const ev = parseTTFeed(src, await r.text()); status[src.id] = ev.length; return ev;
      }
      if (src.mode === 'squarespace') {
        let ev = [];
        // robots.txt kieltää ?format=json -osoitteet → luetaan tavallinen HTML-sivu
        { const rh = await cachedFetch(src.site + src.path, ctx); if (!rh.ok) { status[src.id] = 'HTTP ' + rh.status; return []; } ev = parseSquarespace(src, await rh.text(), debug); }
        status[src.id] = ev.length;
        return ev;
      }
      const r = await cachedFetch(src.site + src.path, ctx);
      if (!r.ok) { status[src.id] = 'HTTP ' + r.status; return []; }
      const html = await r.text();
      const ev = src.mode === 'text' ? parseTextBlocks(src, html, debug) : parseListing(src, html, debug);
      status[src.id] = ev.length;
      return ev;
    } catch (e) { status[src.id] = 'virhe: ' + e.message; return []; }
  }));
  const events = lists.flat().map(classify).filter(e => e.date >= today)
    .sort((a, b) => (a.date + (a.start || a.doors || '99')).localeCompare(b.date + (b.start || b.doors || '99')));
  return { v: VERSION, updated: new Date().toISOString(), today, status, events };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Ajastettu päivitys: hae tapahtumat, täydennä genret MusicBrainzista (enintään BUDGET uutta artistia / ajo), tallenna KV:hen
export async function refresh(env, ctx, budget = 5) { // Workers free: max 50 alipyyntöä / ajo (lähteet 2×10 + Wikidata 3×5)
  const data = await collect(ctx);
  let gmap = {};
  if (env.NYT) { try { gmap = JSON.parse(await env.NYT.get('genres') || '{}'); } catch { gmap = {}; } }
  // GitHub Actionsin MusicBrainz-haun tulokset (nyt-data/genres.json) ovat ensisijaisia
  let fromFile = 0;
  if (env.ASSETS) { try { const r = await env.ASSETS.fetch('https://assets.local/nyt-data/genres.json'); if (r.ok) { const fm = await r.json(); for (const [k, v] of Object.entries(fm)) if (v && v.g && !(gmap[k] && gmap[k].g)) { gmap[k] = v; fromFile++; } } } catch {} }
  const now = Date.now(); let used = 0, changed = false, mbDown = true; const log = ['tiedostosta ' + fromFile];
  const keys = [...new Set(data.events.map(artistKey).filter(Boolean))];
  for (const k of keys) {
    const hit = gmap[k];
    if (hit && (hit.g || now - hit.t < 14 * 864e5)) continue;
    if (used >= budget) break;
    used++;
    let g = null, src = '';
    if (!mbDown) { try { g = await mbGenre(k, MB_UA); src = 'mb'; } catch (e) { mbDown = true; log.push('MB ' + e.message); } }
    if (!g) { try { g = await wdGenre(k, MB_UA); src = g ? 'wd' : src || 'wd'; } catch (e) { log.push(k + ' ! ' + e.message); break; } }
    gmap[k] = { g, t: now, s: src }; changed = true; log.push(k + '=' + g + '(' + src + ')');
    await sleep(mbDown ? 300 : 1100);
  }
  for (const e of data.events) { const k = artistKey(e); if (k && gmap[k] && gmap[k].g) e.genre = gmap[k].g; }
  data.genres = { log, known: keys.filter(k => gmap[k] && gmap[k].g).length, checked: keys.filter(k => gmap[k]).length, artists: keys.length };
  if (env.NYT) {
    if (changed) await env.NYT.put('genres', JSON.stringify(gmap));
    if (Object.values(data.status).every(v => typeof v === 'number')) await env.NYT.put('events', JSON.stringify(data));
  }
  return data;
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(refresh(env, ctx)); },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p === '/nyt') return Response.redirect(url.origin + '/nyt/' + url.search, 301);
    if (p === '/nyt/') {
      return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
    }
    if (p === '/nyt/api/probe') { // kehitystyökalu: näyttää tunnetun lähdesivun rakenteen (ei avoin välityspalvelin)
      const PROBE = { glivelab: 'https://glivelab.fi/tampere/', nokia: 'https://nokiaarena.fi/tapahtumat/', nokiaen: 'https://nokiaarena.fi/en/events/', tampteretalo: 'https://www.tampere-talo.fi/tapahtumakalenteri/' };
      const u = PROBE[url.searchParams.get('src')]; if (!u) return new Response('?src=' + Object.keys(PROBE).join('|'), { status: 400 });
      let r, h; try { r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, redirect: 'follow' }); h = await r.text(); } catch (e) { return new Response(JSON.stringify({ error: String(e && e.stack || e) }), { headers: { 'Content-Type': 'application/json' } }); }
      h = h.replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, '').replace(/<(img|source|link|meta|path)\b[^>]*>/gi, '').replace(/\s(?!class=|href=)[\w:-]+=("[^"]*"|'[^']*')/g, '').replace(/\s+/g, ' ');
      const from = +(url.searchParams.get('from') || 0);
      return new Response(JSON.stringify({ status: r.status, length: h.length, html: h.slice(from, from + 30000) }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (p === '/nyt/api/tapahtumat.json') {
      const debug = url.searchParams.has('debug');
      if (debug) return new Response(JSON.stringify(await collect(ctx, true), null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
      if (url.searchParams.has('raw')) { // kehitystyökalu: tapahtumapaikan sivun HTML-lähde (vain sallitut paikat), skriptit ja rajapintaosoitteet näkyviin
        let u; try { u = new URL(url.searchParams.get('raw')); } catch { return new Response('bad url', { status: 400 }); }
        if (!/(^|\.)komediateatteri\.fi$|(^|\.)ttt-teatteri\.fi$|(^|\.)tampereenteatteri\.fi$/.test(u.hostname)) return new Response('host not allowed', { status: 403 });
        const r = await fetch(u.href, { headers: { 'User-Agent': UA } }); const t = await r.text();
        const ref = [...new Set([...t.matchAll(/(?:src|href|data-[\w-]+|url)\s*[=:]\s*["']([^"']*(?:ajax|api|json|\.js|lippu|eventim|tiketti|ohjelmisto)[^"']*)["']/gi)].map(m => m[1]))];
        return new Response('HTTP ' + r.status + '\n\nREFS:\n' + ref.join('\n') + '\n\nHTML:\n' + (() => { let h = url.searchParams.has('keep') ? t : t.replace(/<(svg|style|script|head|noscript)[\s\S]*?<\/\1>/gi, '').replace(/\s(?:style|srcset|sizes)="[^"]*"/gi, ''); const q = url.searchParams.get('q'); if (q) { const i = h.indexOf(q); h = i < 0 ? 'q not found' : h.slice(Math.max(0, i - 3000), i + 3000); } return h.slice(0, 60000); })(), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
      }
      if (url.searchParams.has('wd')) { const dbg = {}; let g = null, err = null; try { g = await wdGenre(url.searchParams.get('wd'), MB_UA, dbg); } catch (e) { err = e.message; } return new Response(JSON.stringify({ g, err, dbg }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
      if (url.searchParams.has('refresh') && env.NYT) { const d = await refresh(env, ctx, 5); return new Response(JSON.stringify({ v: d.v, status: d.status, genres: d.genres }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
      if (env.NYT) { const stored = await env.NYT.get('events'); if (stored) { const d = JSON.parse(stored); d.events = d.events.filter(e => e.date >= todayHelsinki()); return new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=600', 'Access-Control-Allow-Origin': '*' } }); } }
      const cache = caches.default, key = new Request(url.origin + p);
      let res = await cache.match(key);
      if (!res) {
        const data = await collect(ctx);
        res = new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=1800', 'Access-Control-Allow-Origin': '*' } });
        if (Object.values(data.status).every(v => typeof v === 'number')) ctx.waitUntil(cache.put(key, res.clone()));
      }
      return res;
    }
    // kaikki muu: historiasivuston staattiset tiedostot
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
