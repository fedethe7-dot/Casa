/* =========================================================
   Sistema dell'hub: sblocco a sequenza, chiave di sistema,
   impostazioni uniche (chi sei, tema), invito famiglia, backup.

   SICUREZZA, in breve
   - La CHIAVE DI SISTEMA (8-40 tra lettere, numeri e simboli) è la stessa in tutti i fogli:
     sono gli script Google a controllarla, quindi da internet
     senza chiave non si legge niente.
   - La SEQUENZA protegge il telefono: senza sequenza non si apre
     l'hub e le app rimandano qui (vedi blocco.js).
   - La sequenza non viene mai salvata: si salva solo una sua
     "impronta" (hash SHA-256 con sale), che non si può invertire.
   ========================================================= */
'use strict';
(function () {
  const BASE = 'https://fedethe7-dot.github.io';
  const URL_ANIMALI = 'https://script.google.com/macros/s/AKfycbwNiO6zEPwRaKBYlKThhAcG_T4x9eyxcTgsYctVRcWJfaDktp7Jl9gS00yraGfQFZVN/exec';
  const URL_CASA = 'https://script.google.com/macros/s/AKfycbxdj3IFzUgoMA3PLSxcetu9Q_yqGX2kvQlXXsqEg4Z_WU0d80_XHhrQnap_DK02Ehxo/exec';
  const NOMI_BASE = ['Federico', 'Mamma', 'Sorella'];

  /* ---------- memoria ---------- */
  const raw = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const json = k => { try { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* niente */ } };
  const del = k => { try { localStorage.removeItem(k); } catch (e) { /* niente */ } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => document.querySelector(s);
  const conTimeout = (p, ms = 15000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('tempo scaduto')), ms))]);

  /* ---------- stile ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .topbar{position:absolute;top:14px;right:14px;display:flex;gap:8px;z-index:2}
  .tbtn{width:42px;height:42px;border-radius:50%;border:0;background:#0b0d1266;color:#fff;font-size:19px;display:grid;place-items:center;backdrop-filter:blur(6px)}
  #seq{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#fff;
    background:linear-gradient(180deg,#0b0d1280,#0b0d12f0),url("sfondo.jpg") center/cover #0b0d12;padding:24px;text-align:center}
  #seq.nascosto{display:none}
  #seq h3{font-size:22px;font-weight:700}
  #seq .sub{color:#ffffffb3;font-size:15px;min-height:20px}
  #seq .sub.err{color:#ff8a8d}
  #seq svg{width:min(300px,80vw);height:min(300px,80vw);touch-action:none}
  #seq svg.scuoti{animation:scuoti .35s}
  @keyframes scuoti{25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}
  #seq .link{background:none;border:0;color:#aab8ff;font-size:15px;font-weight:600;padding:8px}
  .sheet-bg{position:fixed;inset:0;z-index:45;background:#000a;display:flex;align-items:flex-end;justify-content:center}
  .sheet-bg.nascosto{display:none}
  .sheet{background:var(--bg);color:var(--txt);width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:24px 24px 0 0;padding:20px 18px calc(28px + env(safe-area-inset-bottom))}
  .sheet h3{font-size:21px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}
  .sheet h4{font-size:15px;margin:22px 0 8px;color:var(--sub);font-weight:650}
  .sheet .x{border:0;background:var(--card2);color:var(--txt);width:38px;height:38px;border-radius:50%;font-size:18px}
  .sheet .box{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px}
  .sheet p.nota{font-size:13.5px;color:var(--sub);line-height:1.4;margin-top:8px}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{border:1.5px solid var(--line);background:var(--card);color:var(--txt);border-radius:20px;padding:9px 14px;font-size:15px}
  .chip.on{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 20%,transparent)}
  .sheet input{width:100%;font-size:18px;letter-spacing:2px;padding:12px 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--card2);color:var(--txt);margin-top:4px}
  .sheet input.url{font-size:14px;letter-spacing:0}
  .bt{display:block;width:100%;border:0;border-radius:14px;padding:14px;font-size:16px;font-weight:650;margin-top:10px;background:var(--acc);color:#fff}
  .bt.sec{background:var(--card2);color:var(--txt)}
  .bt.dng{background:transparent;color:#e5484d;border:1.5px solid #e5484d55}
  .stato{margin-top:10px;display:flex;flex-direction:column;gap:6px;font-size:14px}
  .toast2{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#f2f4f8;color:#141821;padding:12px 18px;border-radius:14px;font-size:15px;font-weight:600;z-index:60;box-shadow:0 6px 24px #0006;max-width:90vw;text-align:center}
  `;
  document.head.appendChild(css);

  function toast(t) {
    const d = document.createElement('div'); d.className = 'toast2'; d.textContent = t;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2800);
  }

  /* ---------- impronta della sequenza ---------- */
  async function impronta(seq) {
    let sale = raw('eco.sale');
    if (!sale) { sale = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); put('eco.sale', sale); }
    const dati = new TextEncoder().encode('eco|' + sale + '|' + seq);
    const h = await crypto.subtle.digest('SHA-256', dati);
    return Array.from(new Uint8Array(h), b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ---------- griglia della sequenza ---------- */
  function griglia(svg, finito) {
    const P = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) P.push({ x: 50 + c * 100, y: 50 + r * 100 });
    svg.setAttribute('viewBox', '0 0 300 300');
    svg.innerHTML = `<polyline id="sqLinea" fill="none" stroke="#8fa6ff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
      <line id="sqCoda" visibility="hidden" stroke="#8fa6ff" stroke-width="6" stroke-linecap="round" opacity=".5"/>
      ${P.map((p, i) => `<circle class="pt" data-i="${i}" cx="${p.x}" cy="${p.y}" r="11" fill="#ffffffcc"/>`).join('')}`;
    const linea = svg.querySelector('#sqLinea'), coda = svg.querySelector('#sqCoda');
    let scelti = [], attivo = false;
    const pos = e => { const b = svg.getBoundingClientRect(); return { x: (e.clientX - b.left) * 300 / b.width, y: (e.clientY - b.top) * 300 / b.height }; };
    const ridisegna = () => {
      linea.setAttribute('points', scelti.map(i => P[i].x + ',' + P[i].y).join(' '));
      svg.querySelectorAll('.pt').forEach(c => {
        const on = scelti.includes(+c.dataset.i);
        c.setAttribute('r', on ? 16 : 11); c.setAttribute('fill', on ? '#8fa6ff' : '#ffffffcc');
      });
    };
    const tocca = p => {
      P.forEach((q, i) => {
        if (scelti.includes(i) || Math.hypot(q.x - p.x, q.y - p.y) > 34) return;
        const ult = scelti[scelti.length - 1];
        if (ult !== undefined) {   // passa sopra un punto in mezzo: lo prende anche quello (come Android)
          const m = (ult + i) / 2;
          if (Number.isInteger(m) && (P[ult].x + P[i].x) / 2 === P[m].x && (P[ult].y + P[i].y) / 2 === P[m].y && !scelti.includes(m)) scelti.push(m);
        }
        scelti.push(i);
        if (navigator.vibrate) navigator.vibrate(12);
      });
      ridisegna();
    };
    svg.onpointerdown = e => { e.preventDefault(); svg.setPointerCapture(e.pointerId); attivo = true; scelti = []; tocca(pos(e)); };
    svg.onpointermove = e => {
      if (!attivo) return;
      const p = pos(e); tocca(p);
      const u = scelti[scelti.length - 1];
      if (u !== undefined) { coda.setAttribute('visibility', 'visible'); coda.setAttribute('x1', P[u].x); coda.setAttribute('y1', P[u].y); coda.setAttribute('x2', p.x); coda.setAttribute('y2', p.y); }
    };
    const fine = () => {
      if (!attivo) return; attivo = false;
      coda.setAttribute('visibility', 'hidden');
      const s = scelti.slice();
      setTimeout(() => { scelti = []; ridisegna(); }, 350);
      if (s.length) finito(s.join('-'));
    };
    svg.onpointerup = fine; svg.onpointercancel = fine;
  }

  /* ---------- schermata della sequenza ---------- */
  // modo: 'sblocca' | 'crea'. Restituisce una Promise che si risolve a lavoro finito.
  function schermataSequenza(modo, testo) {
    return new Promise(risolvi => {
      const box = $('#seq');
      box.innerHTML = `<h3 id="sqT"></h3><div class="sub" id="sqS"></div><svg id="sqG"></svg>
        <button class="link" id="sqL"></button>`;
      box.classList.remove('nascosto');
      const T = $('#sqT'), Sb = $('#sqS'), G = $('#sqG'), L = $('#sqL');
      const msg = (t, err) => { Sb.textContent = t; Sb.classList.toggle('err', !!err); if (err) { G.classList.remove('scuoti'); void G.offsetWidth; G.classList.add('scuoti'); } };
      const chiudi = v => { box.classList.add('nascosto'); box.innerHTML = ''; risolvi(v); };

      if (modo === 'crea') {
        let prima = '';
        T.textContent = '🔒 Crea la tua sequenza'; msg(testo || 'Unisci almeno 4 punti');
        L.textContent = 'Annulla'; L.onclick = () => chiudi(false);
        griglia(G, async s => {
          if (s.split('-').length < 4) return msg('Servono almeno 4 punti', true);
          if (!prima) { prima = s; T.textContent = '🔁 Rifalla uguale'; return msg('Ridisegna la sequenza per conferma'); }
          if (s !== prima) { prima = ''; T.textContent = '🔒 Crea la tua sequenza'; return msg('Non erano uguali, riprova da capo', true); }
          put('eco.sequenza', await impronta(s));
          EcoBlocco.sblocca();
          toast('Sequenza salvata 🔒'); chiudi(true);
        });
        return;
      }

      // sblocca
      T.textContent = 'Ciao ' + (raw('eco.me') || '') + ' 👋'; msg(testo || 'Disegna la sequenza per entrare');
      L.textContent = 'Non ricordo la sequenza';
      L.onclick = async () => {
        const chiave = raw('eco.chiave');
        if (chiave) {
          const k = prompt('Per togliere la sequenza scrivi la chiave di sistema:');
          if (k == null) return;
          if (k.trim() !== chiave) return msg('Chiave sbagliata', true);
        } else if (!confirm('Vuoi togliere la sequenza da questo telefono?')) return;
        del('eco.sequenza'); EcoBlocco.sblocca(); chiudi('reset');
      };
      griglia(G, async s => {
        const attesa = Number(raw('eco.attesaFino') || 0);
        if (attesa > Date.now()) return msg(`Troppi tentativi: aspetta ${Math.ceil((attesa - Date.now()) / 1000)} secondi`, true);
        if (await impronta(s) === raw('eco.sequenza')) {
          put('eco.errori', '0'); EcoBlocco.sblocca(); chiudi(true); return;
        }
        const n = Number(raw('eco.errori') || 0) + 1; put('eco.errori', String(n));
        if (n >= 5) { put('eco.attesaFino', String(Date.now() + 30000)); put('eco.errori', '0'); return msg('Troppi tentativi: aspetta 30 secondi', true); }
        msg('Sequenza sbagliata', true);
      });
    });
  }

  /* ---------- tema per tutte le app ---------- */
  function applicaTema() {
    const t = raw('eco.tema') || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = t;
  }
  function salvaTema(t) {
    put('eco.tema', t);
    put('lavori2.tema', JSON.stringify(t));   // Lavori: 'auto' | 'light' | 'dark'
    put('hv_tema', t);                         // Gestione Casa: stessi valori
    applicaTema();
  }

  /* ---------- chi sei ---------- */
  function nomiFamiglia() {
    const c = json('lavori2.cache');
    const daLavori = (c && c.persone || []).map(p => p.nome).filter(Boolean);
    return daLavori.length ? daLavori : NOMI_BASE;
  }
  function salvaChi(nome) {
    put('eco.me', nome);
    const c = json('lavori2.cache');
    const nomiLavori = (c && c.persone || []).map(p => p.nome);
    if (!nomiLavori.length || nomiLavori.includes(nome)) put('lavori2.me', JSON.stringify(nome));
    const a = json('animali_cfg') || {}; a.chi = nome; put('animali_cfg', JSON.stringify(a));
  }

  /* ---------- chiave di sistema: collega tutte le app ---------- */
  async function provaLavori(k) {
    const url = json('lavori2.url');
    if (!url) return { ok: false, t: 'Manca il link dello script di Lavori (scrivilo qui sopra o usa il link d\'invito)' };
    const r = await conTimeout(fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'list', pin: k }) }));
    const j = await r.json();
    if (!j.ok) return { ok: false, t: 'il foglio di Lavori ha un PIN diverso' };
    put('lavori2.pin', JSON.stringify(k)); put('lavori2.cache', JSON.stringify(j));
    return { ok: true };
  }
  async function provaAnimali(k) {
    const q = new URLSearchParams({ action: 'dati', k });
    const r = await conTimeout(fetch(URL_ANIMALI + '?' + q.toString()));
    const j = await r.json();
    if (!j.ok) return { ok: false, t: 'il foglio di Animali ha un codice diverso' };
    const a = json('animali_cfg') || {}; a.k = k; a.chi = a.chi || raw('eco.me') || 'Federico';
    put('animali_cfg', JSON.stringify(a));
    put('animali_dati', JSON.stringify({ animali: j.animali || [], registro: j.registro || [] }));
    return { ok: true };
  }
  async function provaCasa(k) {
    const r = await conTimeout(fetch(URL_CASA, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ azione: 'login', pin: k, utente: raw('eco.me') || 'Federico' }) }));
    const j = await r.json();
    if (!j.ok) return { ok: false, t: j.errore || 'il foglio di Gestione Casa ha un PIN diverso' };
    put('hv_token', j.token); put('hv_utente', j.utente || raw('eco.me') || '');
    return { ok: true };
  }
  async function collegaTutte(k) {
    put('eco.chiave', k);
    const prove = [['🧹 Lavori di casa', provaLavori], ['🐶 Animali di casa', provaAnimali], ['🏠 Gestione Casa', provaCasa]];
    const out = [];
    for (const [nome, f] of prove) {
      try { out.push([nome, await f(k)]); }
      catch (e) { out.push([nome, { ok: false, t: 'nessuna risposta (' + e.message + ')' }]); }
    }
    return out;
  }
  // Se l'accesso di Gestione Casa scade, l'hub rientra da solo con la chiave
  async function rientraCasa() {
    const k = raw('eco.chiave');
    if (!k) return false;
    try { return (await provaCasa(k)).ok; } catch (e) { return false; }
  }

  /* ---------- invito per la famiglia ---------- */
  function linkInvito() {
    const o = { k: raw('eco.chiave') || '', lu: json('lavori2.url') || '' };
    const b = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
    return BASE + '/Casa/#invito=' + encodeURIComponent(b);
  }
  function leggiInvito() {
    const m = location.hash.match(/invito=([^&]+)/);
    if (!m) return null;
    history.replaceState(null, '', location.pathname);
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
      if (o.lu && /^https:\/\/script\.google\.com\//.test(o.lu)) put('lavori2.url', JSON.stringify(o.lu));
      return o;
    } catch (e) { return null; }
  }

  /* ---------- backup di tutte le app ---------- */
  async function backupTutto() {
    const k = raw('eco.chiave');
    const pac = { tipo: 'Backup ecosistema di Federico', versione: 1, creato: new Date().toISOString(), da: raw('eco.me') || '', app: {} };
    const errori = [];
    // Lavori
    try {
      const url = json('lavori2.url'), pin = json('lavori2.pin');
      if (url) {
        const r = await conTimeout(fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'list', pin }) }));
        const j = await r.json(); if (!j.ok) throw new Error(j.error); pac.app.lavori = j;
      } else errori.push('Lavori non collegato');
    } catch (e) { errori.push('Lavori: ' + e.message); }
    // Animali
    try {
      const a = json('animali_cfg') || {};
      if (a.k) {
        const r = await conTimeout(fetch(URL_ANIMALI + '?' + new URLSearchParams({ action: 'dati', k: a.k })));
        const j = await r.json(); if (!j.ok) throw new Error(j.errore); pac.app.animali = { animali: j.animali, registro: j.registro };
      } else errori.push('Animali non collegato');
    } catch (e) { errori.push('Animali: ' + e.message); }
    // Gestione Casa
    try {
      let token = raw('hv_token');
      if (!token && k && await rientraCasa()) token = raw('hv_token');
      if (token) {
        let r = await conTimeout(fetch(URL_CASA, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ azione: 'dati', token }) }));
        let j = await r.json();
        if (!j.ok && j.codice === 'SESSIONE' && await rientraCasa()) {
          r = await conTimeout(fetch(URL_CASA, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ azione: 'dati', token: raw('hv_token') }) }));
          j = await r.json();
        }
        if (!j.ok) throw new Error(j.errore); delete j.token; pac.app.gestioneCasa = j;
      } else errori.push('Gestione Casa non collegata');
    } catch (e) { errori.push('Gestione Casa: ' + e.message); }
    // Casa (pagamenti): copia salvata sul telefono
    const pag = json('gestioneCasa.v1');
    if (pag) pac.app.pagamenti = pag; else errori.push('Casa (pagamenti): nessuna copia su questo telefono');

    if (!Object.keys(pac.app).length) throw new Error('Nessuna app collegata: inserisci prima la chiave di sistema');
    pac.note = errori;
    const giorno = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(pac, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `backup-app-casa-${giorno}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    put('eco.ultimoBackup', giorno);
    return { incluse: Object.keys(pac.app), errori };
  }

  /* ---------- pannello impostazioni ---------- */
  function apriImpostazioni(avviso) {
    const bg = $('#imp');
    const me = raw('eco.me') || '';
    const tema = raw('eco.tema') || 'auto';
    const haSeq = !!raw('eco.sequenza');
    const ub = raw('eco.ultimoBackup');
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">
      <h3>⚙️ Impostazioni <button class="x" id="impX" aria-label="Chiudi">✕</button></h3>
      <p class="nota">Valgono per tutte le app: non serve più impostarle una per una.</p>
      ${avviso ? `<div class="box" style="margin-top:12px">${esc(avviso)}</div>` : ''}

      <h4>👤 Chi sei</h4>
      <div class="chips" id="impChi">${nomiFamiglia().map(n => `<button class="chip ${n === me ? 'on' : ''}" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>

      <h4>🔑 Chiave di sistema</h4>
      <div class="box">
        <input id="impK" type="password" maxlength="40" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Da 8 a 40: lettere, numeri, simboli" value="${esc(raw('eco.chiave') || '')}" autocomplete="off">
        ${json('lavori2.url') ? '' : `<input id="impLU" class="url" type="url" placeholder="Link dello script di Lavori (…/exec)">`}
        <button class="bt" id="impCollega">Collega tutte le app</button>
        <div class="stato" id="impStato"></div>
        <p class="nota">Una sola chiave per Lavori, Animali e Gestione Casa. Deve essere la stessa scritta nei loro fogli Google.
        L'app Casa dei pagamenti resta con l'accesso Google.</p>
      </div>

      <h4>🔒 Sblocco a sequenza</h4>
      <div class="box">
        <button class="bt ${haSeq ? 'sec' : ''}" id="impSeq">${haSeq ? 'Cambia la sequenza' : 'Crea la sequenza'}</button>
        ${haSeq ? '<button class="bt sec" id="impBlocca">Blocca adesso</button><button class="bt dng" id="impNoSeq">Togli la sequenza</button>' : ''}
        <p class="nota">Senza sequenza l'hub non si apre, e le app rimandano qui. Dopo lo sblocco restano aperte per 30 minuti.</p>
      </div>

      <h4>🎨 Tema</h4>
      <div class="chips" id="impTema">${[['auto', '📱 Come il telefono'], ['light', '☀️ Chiaro'], ['dark', '🌙 Scuro']].map(([k, t]) => `<button class="chip ${k === tema ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div>

      <h4>👨‍👩‍👧 Famiglia</h4>
      <div class="box">
        <button class="bt sec" id="impInvito">📲 Manda il link d'invito</button>
        <p class="nota">Contiene la chiave di sistema: mandalo solo nella chat di famiglia. Aprendolo, il telefono di mamma o di Beatrice si collega a tutte le app.</p>
      </div>

      <h4>💾 Backup</h4>
      <div class="box">
        <button class="bt sec" id="impBackup">Scarica il backup di tutte le app</button>
        <p class="nota">${ub ? 'Ultimo backup: ' + new Date(ub).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) + '.' : 'Nessun backup fatto da questo telefono.'}
        Un unico file con i dati di tutte le app: salvalo su Google Drive.</p>
      </div>
    </div>`;
    bg.classList.remove('nascosto');
    const chiudi = () => { bg.classList.add('nascosto'); bg.innerHTML = ''; };
    bg.onclick = e => { if (e.target === bg) chiudi(); };
    $('#impX').onclick = chiudi;

    $('#impChi').onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      salvaChi(b.dataset.n);
      $('#impChi').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
      toast('Ciao ' + b.dataset.n + ' 👋');
    };
    $('#impTema').onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      salvaTema(b.dataset.t);
      $('#impTema').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
    };
    $('#impCollega').onclick = async () => {
      const k = $('#impK').value.trim();
      const st = $('#impStato');
      if (!/^(?!.*['\"`\\])[\x21-\x7E]{8,40}$/.test(k)) { st.innerHTML = '<span>⚠️ Da 8 a 40 caratteri: lettere, numeri e simboli come ! ? # @. Niente spazi, accenti, apostrofi o virgolette</span>'; return; }
      if (!raw('eco.me')) { st.innerHTML = '<span>⚠️ Prima scegli chi sei, qui sopra</span>'; return; }
      const lu = $('#impLU') && $('#impLU').value.trim();
      if (lu) { if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(lu)) { st.innerHTML = '<span>⚠️ Il link di Lavori deve finire con /exec</span>'; return; } put('lavori2.url', JSON.stringify(lu)); }
      const b = $('#impCollega'); b.disabled = true; b.textContent = 'Collego…'; st.innerHTML = '';
      const ris = await collegaTutte(k);
      st.innerHTML = ris.map(([n, r]) => `<span>${r.ok ? '✅' : '⚠️'} ${esc(n)}${r.ok ? '' : ': ' + esc(r.t)}</span>`).join('')
        + '<span>🔐 💶 Casa (pagamenti): accesso Google, come prima</span>';
      b.disabled = false; b.textContent = 'Collega tutte le app';
      if (window.Ecosistema) Ecosistema.aggiorna();
    };
    $('#impSeq').onclick = async () => {
      if (raw('eco.sequenza')) {   // per cambiarla serve quella vecchia
        chiudi(); EcoBlocco.blocca();
        await schermataSequenza('sblocca', 'Prima disegna la sequenza di adesso');
      } else chiudi();
      await schermataSequenza('crea');
    };
    if ($('#impBlocca')) $('#impBlocca').onclick = () => { chiudi(); EcoBlocco.blocca(); schermataSequenza('sblocca'); };
    if ($('#impNoSeq')) $('#impNoSeq').onclick = async () => {
      chiudi(); EcoBlocco.blocca();
      await schermataSequenza('sblocca', 'Disegnala per toglierla');
      del('eco.sequenza'); EcoBlocco.sblocca(); toast('Sequenza tolta');
    };
    $('#impInvito').onclick = async () => {
      if (!raw('eco.chiave')) return toast('Prima collega le app con la chiave');
      const l = linkInvito();
      try {
        if (navigator.share) await navigator.share({ title: 'Le mie app', text: 'Apri questo link per collegare il telefono alle app di casa:', url: l });
        else { await navigator.clipboard.writeText(l); toast('Link copiato 📋'); }
      } catch (e) { /* annullato */ }
    };
    $('#impBackup').onclick = async () => {
      const b = $('#impBackup'); b.disabled = true; b.textContent = 'Preparo il backup…';
      try {
        const r = await backupTutto();
        toast('Backup scaricato 💾 (' + r.incluse.length + ' app)');
        if (r.errori.length) alert('Backup fatto. Non incluso:\n• ' + r.errori.join('\n• '));
      } catch (e) { toast('⚠️ ' + e.message); }
      b.disabled = false; b.textContent = 'Scarica il backup di tutte le app';
    };
  }

  /* ---------- avvio ---------- */
  applicaTema();

  // Dove tornare dopo lo sblocco (solo pagine delle mie app)
  function ritorno() {
    const m = location.hash.match(/sblocca=([^&]+)/);
    if (!m) return null;
    try {
      const u = new URL(decodeURIComponent(m[1]));
      return u.origin === location.origin ? u.href : null;
    } catch (e) { return null; }
  }

  async function avvio(dopoIntro) {
    const invito = leggiInvito();
    const torna = ritorno();
    if (/sblocca=/.test(location.hash)) history.replaceState(null, '', location.pathname);   // un indirizzo esterno viene ignorato
    if (EcoBlocco.attivo() && !EcoBlocco.sbloccato()) {
      await dopoIntro;
      if (await schermataSequenza('sblocca') === 'reset') await schermataSequenza('crea', 'Scegline una nuova');
    }
    if (torna) { location.replace(torna); return false; }
    if (invito) {
      if (invito.k) put('eco.chiave', invito.k);
      apriImpostazioni('👋 Benvenuto! 1) Scegli chi sei  2) Premi "Collega tutte le app"  3) Crea la tua sequenza.');
    } else if (!raw('eco.me') && !raw('eco.chiave')) {
      apriImpostazioni('👋 Primo avvio: scegli chi sei e inserisci la chiave di sistema.');
    }
    return true;
  }

  window.Sistema = { avvio, apriImpostazioni, rientraCasa, schermataSequenza };
})();
