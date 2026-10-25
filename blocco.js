/* =========================================================
   Blocco comune dell'ecosistema.
   Va incluso in cima a ogni app:  <script src="/Casa/blocco.js"></script>
   Se nell'hub è impostata la sequenza e il telefono è bloccato,
   l'app rimanda all'hub per lo sblocco e poi torna dov'era.
   Lo sblocco dura 30 minuti e si rinnova finché usi le app.
   ========================================================= */
(function () {
  var K_SEQ = 'eco.sequenza', K_FINO = 'eco.sbloccatoFino', DURATA = 30 * 60 * 1000;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* niente */ } }

  var B = window.EcoBlocco = {
    attivo: function () { return !!get(K_SEQ); },
    sbloccato: function () { return !B.attivo() || Number(get(K_FINO) || 0) > Date.now(); },
    rinnova: function () { if (B.sbloccato()) set(K_FINO, String(Date.now() + DURATA)); },
    blocca: function () { set(K_FINO, '0'); },
    sblocca: function () { set(K_FINO, String(Date.now() + DURATA)); }
  };

  // L'hub gestisce da solo il proprio blocco
  if (/^\/Casa\//i.test(location.pathname)) return;

  function controlla() {
    if (!B.sbloccato()) {
      document.documentElement.style.visibility = 'hidden';   // non mostrare i dati nemmeno per un attimo
      location.replace('/Casa/#sblocca=' + encodeURIComponent(location.href));
    } else {
      B.rinnova();
    }
  }
  controlla();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') controlla();
  });
})();
