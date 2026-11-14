# Sketchbook – regulile proiectului

Sketchbook este o aplicație de desen în browser, cu caiete 3D (landing + aplicație).

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
og.png                     imaginea de previzualizare a site-ului (link-uri distribuite)
.github/workflows/pages.yml  publică repo-ul pe GitHub Pages la push pe main
```
- Butoanele din landing care deschid aplicația duc la `app/`.
- Folosește căi relative (fără `/` la început), pentru că site-ul stă la `/Sketchbook/`.

## Reguli tehnice
- Aplicația este **un singur fișier**: `app/index.html` (HTML/CSS/JS, **fără framework**).
- Este PWA: `app/sw.js` + `app/manifest.webmanifest`. Când schimbi fișierele din shell, crește versiunea cache-ului din `sw.js`.
- Casetele de text (unealta Text) sunt „bucăți” de text cu stil: `o.rs = [{t, c, f, b, i, fm}]` (culoare, mărime, bold, italic, font); doar ce diferă de stilul casetei se salvează. `o.t` e textul simplu (pentru căutare). Desenarea pe canvas e în `drawRuns()`, editarea în funcțiile `rt*`.
- Cu tastatura deschisă, editorul se potrivește în zona vizibilă (`initKb()`, clasa `kb`), iar bara de text rămâne deasupra tastaturii.
- Nu încărca nimic de pe alte site-uri (fonturi, librării, CDN): pune fișierele în proiect. Adaugă fișierele noi și în lista din `sw.js` dacă trebuie să meargă offline.
- Datele stau **local în browser** (IndexedDB). Conturile și sincronizarea în cloud vin mai târziu.
  - Fiecare caiet și fiecare pagină e o înregistrare separată: `v2:idx` (ordinea caietelor), `v2:b:<id>` (caietul fără pagini), `v2:p:<id>:<i>` (o pagină). Se scrie doar ce s-a schimbat (`writeDiff()`); `persist()` programează salvarea.
  - `savePage()` codează desenul în fundal (`canvasURL()`); înainte de a schimba ordinea paginilor, așteaptă `savesDone()` și crește `cur._sv`.
  - Proprietățile care încep cu `_` nu se salvează.
  - La ieșirea din aplicație se salvează imediat (`saveOnLeave()`). Settings are backup/restaurare (.json) și cere stocare permanentă.
- Undo: ultimul pas e o imagine întreagă, cei vechi doar dreptunghiul schimbat (`histAdd()`), până la 60 de pași / 60 MB.
- Planul Pro nu se poate cumpăra încă: aplicația rulează pe Free. Pentru teste: `app/?demo=pro` (și `?demo=free` ca să revii).

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
1. Conturi + cloud (Supabase)
2. Plăți (Stripe)
3. Pagini legale (GDPR)
4. Publicare Android prin PWA
