# Le mie app

Pagina "home" che raccoglie tutte le app di Federico in un unico posto.

- App collegate: Gestione Casa, Lavori di casa, Animali di casa
- Per aggiungere un'app: una riga nuova nell'elenco `APPS` dentro `index.html`
- Nessun dato personale è salvato qui: ogni app tiene i suoi dati nel proprio foglio Google.

## Come si parlano le app

Tutte le app stanno su `fedethe7-dot.github.io`, quindi sul telefono condividono la stessa memoria del browser.
L'hub (`ecosistema.js`) riusa il collegamento che ogni app ha già salvato (PIN, codice di famiglia, accesso) e mostra
nella sezione **In arrivo**: lavori dei prossimi 14 giorni, scadenze dei cani entro 30 giorni, garanzie in scadenza entro 60.
L'hub non salva dati: li legge ogni volta dalle app. Se un'app non è mai stata aperta su quel telefono, l'hub lo dice.
