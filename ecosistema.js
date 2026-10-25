/* =========================================================
   Ecosistema: l'hub legge le app di famiglia e mette insieme
   quello che sta per succedere (lavori, cani, garanzie).

   Come fa: tutte le app stanno su fedethe7-dot.github.io, quindi
   sul telefono condividono la stessa memoria del browser.
   L'hub riusa il collegamento (PIN / codice / accesso) che ogni
   app ha già salvato: non serve inserire niente due volte.
   Nessun dato viene scritto in questo repository né salvato dall'hub.
   ========================================================= */
'use strict';

const BASE = 'https://fedethe7-dot.github.io';
// Indirizzi degli script (sono già pubblici nel codice delle app; senza PIN non aprono nulla)
const URL_ANIMALI = 'https://script.google.com/macros/s/AKfycbwNiO6zEPwRaKBYlKThhAcG_T4x9eyxcTgsYctVRcWJfaDktp7Jl9gS00yraGfQFZVN/exec';
const URL_CASA = 'https://script.google.com/macros/s/AKfycbxdj3IFzUgoMA3PLSxcetu9Q_yqGX2kvQlXXsqEg4Z_WU0d80_XHhrQnap_DK02Ehxo/exec';

const TIPI_ANIMALI = { Visita: '🩺', Vaccino: '💉', Antiparassitario: '🛡️', Sverminazione: '🪱', Farmaco: '💊', Analisi: '🧪', Peso: '⚖️', Toelettatura: '🛁', Intervento: '🏥', Altro: '📝' };

/* ---------- utilità ---------- */
const leggi = (k, json = true) => {
  try { const v = localStorage.getItem(k); return v == null ? null : (json ? JSON.parse(v) : v); }
  catch (e) { return null; }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pd = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const oggi0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const gg = s => { const d = pd(s); return d ? Math.round((d - oggi0()) / 864e5) : null; };
const conTimeout = (p, ms = 12000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('Tempo scaduto')), ms))]);

function quandoTesto(n) {
  if (n < -1) return `scaduto da ${-n} giorni`;
  if (n === -1) return 'ieri';
  if (n === 0) return 'oggi';
  if (n === 1) return 'domani';
  if (n < 7) return `tra ${n} giorni`;
  if (n < 60) return `tra ${n} giorni`;
  return `tra ${Math.round(n / 30)} mesi`;
}

// Link per creare un lavoro già compilato nell'app Lavori
function linkNuovoLavoro({ emoji, titolo, data, dettagli }) {
  const q = new URLSearchParams({ emoji: emoji || '📋', titolo: titolo || '', data: data || '', dettagli: dettagli || '' });
  return `${BASE}/Lavori/#nuovo?${q.toString()}`;
}

/* ---------- chi sei ---------- */
function chiSei() {
  return leggi('lavori2.me') || (leggi('animali_cfg') || {}).chi || leggi('hv_utente', false) || '';
}

/* ---------- Lavori di casa ---------- */
function eventiLavori(d, me) {
  const out = [];
  (d.lavori || []).forEach(l => {
    if (l.fatto) return;
    const n = gg(l.data);
    if (n === null || n < -7 || n > 14) return;
    const risposte = typeof l.risposte === 'string' ? (() => { try { return JSON.parse(l.risposte); } catch (e) { return {}; } })() : (l.risposte || {});
    const mio = (l.assegnati || []).includes(me);
    const daRispondere = mio && (risposte[me] || {}).r === 'attesa';
    const chi = (l.assegnati || []).join(', ');
    out.push({
      app: 'lavori', emoji: l.emoji || '📋', testo: l.titolo, giorni: n,
      sotto: [n < 0 ? 'non ancora fatto' : '', chi ? 'per ' + chi : ''].filter(Boolean).join(' · '),
      avviso: daRispondere ? 'Devi rispondere' : '',
      link: `${BASE}/Lavori/`
    });
  });
  return out;
}
async function caricaLavori(me) {
  const url = leggi('lavori2.url'), pin = leggi('lavori2.pin');
  const cache = leggi('lavori2.cache');
  if (!url) return { collegata: false, eventi: [] };
  let d = cache;
  try {
    const r = await conTimeout(fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'list', pin }) }));
    const j = await r.json();
    if (j.ok) d = j;
  } catch (e) { /* uso la copia salvata dall'app */ }
  return { collegata: true, eventi: d ? eventiLavori(d, me) : [] };
}

/* ---------- Animali di casa ---------- */
function eventiAnimali(d) {
  const animali = d.animali || [], registro = d.registro || [];
  const vivi = new Map(animali.filter(a => String(a.archiviato).toLowerCase().indexOf('s') !== 0).map(a => [String(a.id), a]));
  const ultimo = {};
  registro.slice().sort((a, b) => (b.data || '').localeCompare(a.data || '') || String(b.creato || '').localeCompare(String(a.creato || '')))
    .forEach(e => { const k = e.animaleId + '|' + e.tipo; if (!ultimo[k]) ultimo[k] = e; });
  return Object.values(ultimo).filter(e => e.scadenza && vivi.has(String(e.animaleId))).map(e => {
    const a = vivi.get(String(e.animaleId));
    const n = gg(e.scadenza);
    const nome = a.nome || e.animale || '';
    const ic = TIPI_ANIMALI[e.tipo] || '🐾';
    return {
      app: 'animali', emoji: ic, testo: `${e.tipo} · ${nome}`, giorni: n,
      sotto: 'entro il ' + pd(e.scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      link: `${BASE}/Animali/`,
      programma: linkNuovoLavoro({ emoji: '🐶', titolo: `${e.tipo} ${nome}`, data: e.scadenza, dettagli: `Promemoria da Animali di casa: ${e.tipo} per ${nome} entro il ${e.scadenza}` })
    };
  }).filter(x => x.giorni !== null && x.giorni <= 30);
}
async function caricaAnimali() {
  const cfg = leggi('animali_cfg') || {};
  const cache = leggi('animali_dati');
  if (!cfg.k) return { collegata: false, eventi: [] };
  let d = cache;
  try {
    const q = new URLSearchParams({ action: 'dati', k: cfg.k });
    const r = await conTimeout(fetch(URL_ANIMALI + '?' + q.toString()));
    const j = await r.json();
    if (j.ok) d = { animali: j.animali || [], registro: j.registro || [] };
  } catch (e) { /* uso la copia salvata dall'app */ }
  return { collegata: true, eventi: d ? eventiAnimali(d) : [] };
}

/* ---------- Gestione Casa (garanzie) ---------- */
function eventiCasa(d) {
  const out = [];
  (d.prodotti || []).forEach(p => {
    if (p['Nel cestino'] || ['Venduto', 'Dismesso', 'Sostituito'].includes(p['Stato'])) return;
    [['Scadenza garanzia', 'Garanzia'], ['Scadenza garanzia aggiuntiva', 'Garanzia aggiuntiva']].forEach(([campo, tipo]) => {
      const n = gg(p[campo]);
      if (n === null || n < -30 || n > 60) return;
      out.push({
        app: 'casa', emoji: '🛡️', testo: `${tipo} · ${p['Nome'] || 'prodotto'}`, giorni: n,
        sotto: (n < 0 ? 'scaduta il ' : 'scade il ') + pd(p[campo]).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
        link: `${BASE}/HomeVault/#/prodotto/${encodeURIComponent(p['ID'])}`
      });
    });
  });
  return out;
}
async function caricaCasa() {
  const token = leggi('hv_token', false);
  if (!token) return { collegata: false, eventi: [] };
  try {
    const r = await conTimeout(fetch(URL_CASA, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ azione: 'dati', token }) }));
    const j = await r.json();
    if (!j.ok) return { collegata: false, eventi: [] };   // accesso scaduto: va riaperta l'app
    return { collegata: true, eventi: eventiCasa(j) };     // i dati restano solo in memoria, come nell'app
  } catch (e) {
    return { collegata: true, eventi: [], errore: true };
  }
}

/* ---------- disegno ---------- */
const NOMI_APP = { lavori: 'Lavori di casa', animali: 'Animali di casa', casa: 'Gestione Casa' };

function rigaEvento(x) {
  const urgente = x.giorni <= 0 ? 'q-urg' : x.giorni <= 3 ? 'q-presto' : '';
  return `<div class="ev ${x.app}">
    <a class="ev-main" href="${esc(x.link)}">
      <span class="ev-ico">${esc(x.emoji)}</span>
      <span class="ev-tx"><span class="ev-t1">${esc(x.testo)}</span>
        <span class="ev-t2">${esc(x.sotto)}${x.avviso ? ` · <b class="ev-avv">${esc(x.avviso)}</b>` : ''}</span></span>
      <span class="ev-quando ${urgente}">${esc(quandoTesto(x.giorni))}</span>
    </a>
    ${x.programma ? `<a class="ev-prog" href="${esc(x.programma)}" title="Crea un lavoro">📅 Programma</a>` : ''}
  </div>`;
}

function disegna(ris) {
  const box = document.getElementById('inarrivo');
  const tutti = [].concat(...ris.map(r => r.eventi)).sort((a, b) => a.giorni - b.giorni);
  const scollegate = ris.filter(r => !r.collegata).map(r => r.nome);

  // contatori sulle finestrelle
  ris.forEach(r => {
    const tile = document.querySelector(`a.app[data-app="${r.app}"]`);
    if (!tile) return;
    let b = tile.querySelector('.badge');
    const n = r.eventi.length;
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'badge'; tile.appendChild(b); }
    b.textContent = n;
    b.classList.toggle('urg', r.eventi.some(e => e.giorni <= 0));
  });

  let html = '';
  if (!tutti.length) {
    html = `<div class="ev-vuoto">✨ Niente in arrivo nei prossimi giorni</div>`;
  } else {
    const gruppi = [
      ['Da recuperare', x => x.giorni < 0],
      ['Oggi e domani', x => x.giorni >= 0 && x.giorni <= 1],
      ['Questa settimana', x => x.giorni > 1 && x.giorni <= 7],
      ['Più avanti', x => x.giorni > 7]
    ];
    gruppi.forEach(([t, f]) => {
      const l = tutti.filter(f);
      if (l.length) html += `<div class="ev-gruppo">${t}</div>` + l.map(rigaEvento).join('');
    });
  }
  if (scollegate.length) {
    const b = scollegate.map(n => `<b>${esc(n)}</b>`);
    const elenco = b.length > 1 ? b.slice(0, -1).join(', ') + ' e ' + b[b.length - 1] : b[0];
    html += `<div class="ev-nota">🔗 Per vedere qui anche ${elenco}, apri ${b.length > 1 ? 'ogni app' : "l'app"} una volta da questo telefono ed entra col PIN.</div>`;
  }
  box.innerHTML = html;
  box.classList.remove('carica');
}

async function aggiornaEcosistema() {
  const me = chiSei();
  const [lav, ani, cas] = await Promise.all([
    caricaLavori(me).catch(() => ({ collegata: false, eventi: [] })),
    caricaAnimali().catch(() => ({ collegata: false, eventi: [] })),
    caricaCasa().catch(() => ({ collegata: false, eventi: [] }))
  ]);
  disegna([
    Object.assign(lav, { app: 'lavori', nome: NOMI_APP.lavori }),
    Object.assign(ani, { app: 'animali', nome: NOMI_APP.animali }),
    Object.assign(cas, { app: 'casa', nome: NOMI_APP.casa })
  ]);
}

window.Ecosistema = { aggiorna: aggiornaEcosistema, chiSei };
