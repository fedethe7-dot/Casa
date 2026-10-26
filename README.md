# Le mie app

Pagina "home" che raccoglie tutte le app di Federico in un unico posto.

- App collegate: Casa (pagamenti), Gestione Casa, Lavori di casa, Animali di casa
- Per aggiungere un'app: una riga nuova nell'elenco `APPS` dentro `index.html`
- Nessun dato personale è salvato qui: ogni app tiene i suoi dati nel proprio foglio Google.

## Come si parlano le app

Tutte le app stanno su `fedethe7-dot.github.io`, quindi sul telefono condividono la stessa memoria del browser.
L'hub (`ecosistema.js`) riusa il collegamento che ogni app ha già salvato (PIN, codice di famiglia, accesso) e mostra
nella sezione **In arrivo**: lavori dei prossimi 14 giorni, scadenze dei cani entro 30 giorni, garanzie in scadenza entro 60.
L'hub non salva dati: li legge ogni volta dalle app. Se un'app non è mai stata aperta su quel telefono, l'hub lo dice.

## Sicurezza e impostazioni uniche (v7)

- **Chiave di sistema** (da 8 a 40 caratteri: lettere, numeri e simboli; niente spazi, accenti, apostrofi o virgolette): la stessa nei fogli di Lavori, Animali e Gestione Casa.
  La si scrive una volta nelle impostazioni dell'hub e collega tutte le app. Sono gli script Google a controllarla.
- **Sblocco a sequenza**: protegge il telefono. Le app includono `/Casa/blocco.js` e, se il telefono è bloccato,
  rimandano all'hub e poi tornano dov'erano. Lo sblocco dura 30 minuti e si rinnova usando le app.
  Della sequenza si salva solo l'impronta (SHA-256 con sale), mai la sequenza.
- **Impostazioni uniche**: chi sei e tema valgono per tutte le app.
- **Invito famiglia**: link che collega il telefono di mamma e Beatrice (contiene la chiave: solo chat di famiglia).
- **Backup**: un unico file JSON con i dati di tutte le app.
- L'app **Casa (pagamenti)** resta con l'accesso Google.
