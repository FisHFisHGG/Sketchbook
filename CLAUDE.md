# Foliet – regulile proiectului

**Foliet** (fostul nume de lucru: Sketchbook) este o aplicație de desen în browser, cu caiete 3D (landing + aplicație).
Găzduire: **Netlify** (landing la `/`, aplicația la `/app/`). Repo-ul se numește încă `Sketchbook`.

## Cum lucrezi cu mine (utilizatorul)
- Răspunde-mi mereu în **română**, simplu; nu sunt programator.
- Interfața aplicației (și a landing-ului) rămâne în **engleză**.
- După fiecare schimbare, spune-mi pe scurt **ce s-a schimbat** și **unde văd rezultatul**.

## Structura
```
index.html                 landing (pagina de prezentare)
app/index.html             aplicația
app/sw.js                  service worker (funcționare offline)
app/manifest.webmanifest   PWA (instalare pe telefon)
app/icon-*.png             iconițe
app/fonts/                 fonturile (locale, fără Google Fonts – GDPR + offline)
app/vendor/pdfjs/          pdf.js 3.11.174 pentru importul PDF (local, offline)
app/vendor/firebase.js     Firebase JS SDK 11.10.0 (app + auth + firestore), un singur fișier (window.FB)
firebase/firestore.rules   regulile de securitate Firestore (se lipesc în consola Firebase)
firebase/storage.rules     Storage blocat complet (nu-l folosim)
og.png                     imaginea de previzualizare a site-ului (link-uri distribuite)
netlify.toml               configurarea Netlify (fără build, publică rădăcina)
.github/workflows/pages.yml  publică și pe GitHub Pages la push pe main (copie de test)
```
- Butoanele din landing care deschid aplicația duc la `app/`.
- Folosește căi relative (fără `/` la început): site-ul merge și la `/` (Netlify), și la `/Sketchbook/` (GitHub Pages).
- Datele interne păstrează vechiul nume (baza IndexedDB `sketchbook`, chei `sb-*` în localStorage) – **nu le redenumi**, altfel utilizatorii își pierd caietele.

## Reguli tehnice
- Aplicația este **un singur fișier**: `app/index.html` (HTML/CSS/JS, **fără framework**).
- Este PWA: `app/sw.js` + `app/manifest.webmanifest`. Când schimbi fișierele din shell, crește versiunea cache-ului din `sw.js`.
- Casetele de text (unealta Text) sunt „bucăți” de text cu stil: `o.rs = [{t, c, f, b, i, fm}]` (culoare, mărime, bold, italic, font); doar ce diferă de stilul casetei se salvează. `o.t` e textul simplu (pentru căutare). Desenarea pe canvas e în `drawRuns()`, editarea în funcțiile `rt*`.
- Cu tastatura deschisă, editorul se potrivește în zona vizibilă (`initKb()`, clasa `kb`), iar bara de text rămâne deasupra tastaturii.
- Nu încărca nimic de pe alte site-uri (fonturi, librării, CDN): pune fișierele în proiect. Adaugă fișierele noi și în lista din `sw.js` dacă trebuie să meargă offline.
- Datele stau **mereu local în browser** (IndexedDB); cu Pro se sincronizează și în cloud (Firebase).
  - Fiecare caiet și fiecare pagină e o înregistrare separată: `v2:idx` (ordinea caietelor), `v2:b:<id>` (caietul fără pagini), `v2:p:<id>:<i>` (o pagină). Se scrie doar ce s-a schimbat (`writeDiff()`); `persist()` programează salvarea.
  - `savePage()` codează desenul în fundal (`canvasURL()`); înainte de a schimba ordinea paginilor, așteaptă `savesDone()` și crește `cur._sv`.
  - Proprietățile care încep cu `_` nu se salvează.
  - La ieșirea din aplicație se salvează imediat (`saveOnLeave()`). Settings are backup/restaurare (.json) și cere stocare permanentă.
- Undo: ultimul pas e o imagine întreagă, cei vechi doar dreptunghiul schimbat (`histAdd()`), până la 60 de pași / 60 MB.
- Planul Pro nu se poate cumpăra încă. `plan` = 'pro' dacă contul are Pro (real) sau, doar local, cu `app/?demo=pro` (`?demo=free` ca să revii). Demo-ul nu pornește sincronizarea.

## Conturi și cloud (Firebase, proiect `sketchbook-b1de1`)
- Login: Google + email/parolă (`fbLoad()`, `accUser()`, fereastra `#acct`). Firebase se încarcă **doar** dacă cineva deschide contul sau a fost logat (`sb-acct`) – utilizatorii fără cont nu contactează Google.
- Pro real = custom claim `stripeRole == 'pro'` (viitoarea extensie Stripe) **sau** documentul `pro/{uid}` în Firestore (creat de mână în consolă, pentru teste/prieteni). Regulile nu permit nimănui să-și dea singur Pro.
- Sincronizare (doar Pro): `users/{uid}` are manifestul `m.{record} = {h, n}`; `users/{uid}/r/{record}` (+ `~~1`, `~~2`…) conține înregistrarea ca JSON, în bucăți de 300.000 caractere. Înregistrările sunt aceleași ca local (`idx`, `b:<id>`, `p:<id>:<i>`, cu `:` → `~`).
- `syncOnce()` compară 3 hash-uri (dispozitiv, cloud, ultima sincronizare salvată în IDB la `sync:<uid>`): schimbat doar aici → trimite; doar în cloud → aduce; pe ambele → câștigă dispozitivul. Ordinea caietelor se combină. Caietul deschis se actualizează după ce e închis.
- Doar Pro poate scrie în cloud (protecție de costuri). Dacă Pro expiră, utilizatorul își poate încă citi datele.
- Test local: simulatorul Firebase (`firebase emulators:exec --only auth,firestore`) + `app/?emu=127.0.0.1` (funcționează doar pe localhost).

## Planuri
| | Free | Pro |
|---|---|---|
| Caiete | 2 | nelimitat |
| Pagini / caiet | 20 | nelimitat |
| Straturi / pagină | 2 | 8 |
| Import PDF | – | da |
| Export PDF / PNG | – | da |

Prețuri Pro: **€3.99 / lună** și **€29.99 / an**. **Nu le schimba fără să mă întrebi.**

## Urmează
1. ~~Conturi + cloud~~ (gata: Firebase)
2. Pagini legale (GDPR): politică de confidențialitate + termeni – **înainte de lansarea conturilor**
3. Plăți (Stripe, prin extensia „Run Payments with Stripe” pentru Firebase → setează `stripeRole`)
4. Publicare Android prin PWA
