# Il Gaming Control Center — la pagina

`https://projectkey.github.io/controllo/` · architettura e decisioni in
`docs/controllo/ARCHITETTURA.md` · l'API del server in `server/funzioni/controllo/LEGGIMI.md`.

Pagina statica, moduli ES, niente build. **Nessun segreto dentro**: solo l'indirizzo del progetto
Supabase e la sua chiave *publishable* (`config.js`), le stesse dell'app. Senza password + codice
TOTP (sessione `aal2`) il server non risponde a niente.

```
index.html      la pagina (Chart.js da jsdelivr)
main.js         l'ingresso: accesso, poi il pannello
accesso.js      password, arruolamento TOTP, codice, scelta password da invito/recupero, 30 min
api.js          L'UNICA porta verso `controllo`: nomi delle azioni e forme delle risposte
app.js          il guscio: menu (§94), selettore app (§4), ricerca (§79), preferiti, recenti, tema
ui.js           h() (mai innerHTML coi dati), formati, finestre col motivo obbligatorio, grafici
pagine/*.js     una pagina per sezione; fasi.js = le sezioni non ancora accese (fase 2/3)
prova.js        dati FINTI, solo con ?prova=1 su localhost (e la pagina lo scrive in cima)
```

## Provarla senza server

```sh
python3 -m http.server 8111 --bind 127.0.0.1 --directory sito
# poi http://localhost:8111/controllo/?prova=1
```

## Regole

- Tutto il DOM passa da `h()` / `metti()`: il `.append()` del browser scrive `null` e
  `[object HTMLDivElement]` come testo (il primo giro di foto aveva il menu così).
- Se il server cambia nome o forma di un'azione, si cambia **`api.js`** e basta.
- Una sezione si accende per un'app solo se il suo adattatore la dichiara in `capacita`.
- Ogni azione che cambia qualcosa chiede il motivo (`confermaConMotivo`); le pericolose anche
  una parola da riscrivere.
- «In approvazione» (409 dal server) non è un errore: si dice «in coda».
- Il link d'invito e «password dimenticata» portano a `…/controllo/`: quell'indirizzo va tra i
  *Redirect URLs* di Supabase Auth, se no Supabase rimanda al *Site URL*.
