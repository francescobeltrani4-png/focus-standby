# Focus StandBy

Una dashboard HTML statica, dark e mobile-first da usare in orizzontale sul telefono. Orologio e calendario funzionano subito, anche senza account. Le sezioni Spotify e Google Tasks **non mostrano dati finti**: restano non collegate finché non completi il consenso OAuth.

## Avvio rapido

Apri `index.html` per provare orologio e calendario. Per le integrazioni, pubblica la cartella su un piccolo hosting HTTPS (GitHub Pages, Netlify, Cloudflare Pages) oppure servila in `localhost` durante i test. Non usare `file://`: i callback OAuth non possono tornare lì.

> Non inserire mai password, client secret o token permanenti in `config.js`. Questo progetto usa solo OAuth PKCE/tokens a breve durata nel browser.

## Spotify: brano in riproduzione

1. Crea una app nella [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Nelle impostazioni aggiungi come Redirect URI l'URL esatto della tua dashboard, per esempio `https://tuonome.github.io/focus-standby/`.
3. Copia il **Client ID** (non il Client Secret) in `config.js` in `spotify.clientId` e inserisci lo stesso URL in `spotify.redirectUri`.
4. Pubblica la cartella, apri la pagina sul Nothing Phone e tocca **Collega** nella card Spotify.

La pagina richiede soltanto lettura dello stato di playback. Dopo il consenso aggiorna automaticamente il brano ogni 30 secondi. Se il token scade, basta ricollegare: un puro sito statico non può custodire in sicurezza un refresh token.

## Google Tasks: attività aperte

1. In [Google Cloud Console](https://console.cloud.google.com/) crea/seleziona un progetto e abilita **Google Tasks API**.
2. Configura la schermata di consenso OAuth; per i test aggiungi il tuo account Google tra gli utenti di test.
3. Crea un client OAuth di tipo **Web application**. Aggiungi il dominio HTTPS della dashboard tra le *Authorized JavaScript origins* (oppure `http://localhost:PORT` per lo sviluppo).
4. Copia il **Client ID** in `config.js` in `googleTasks.clientId`.
5. Apri la dashboard e tocca **Collega** nella card Google Tasks.

La pagina chiede il solo scope `tasks.readonly`, mostra fino a cinque attività non completate della prima lista Google Tasks e non crea, modifica o completa nulla.

## Limiti onesti

- Il calendario è un calendario mensile locale: non legge eventi da Google Calendar.
- Spotify e Google Tasks dipendono dalla rete, dal consenso dell'account e dalle API abilitate.
- Spotify non garantisce una traccia se non è in corso una sessione di playback attiva.
- Ogni browser/sistema può sospendere gli aggiornamenti quando lo schermo è bloccato. Tieni la pagina aperta e il display attivo per un effetto StandBy.
