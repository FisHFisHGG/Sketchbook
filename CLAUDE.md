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
.github/workflows/pages.yml  publică repo-ul pe GitHub Pages la push pe main
```
- Butoanele din landing care deschid aplicația duc la `app/`.
- Folosește căi relative (fără `/` la început), pentru că site-ul stă la `/Sketchbook/`.

## Reguli tehnice
- Aplicația este **un singur fișier**: `app/index.html` (HTML/CSS/JS, **fără framework**).
- Este PWA: `app/sw.js` + `app/manifest.webmanifest`. Când schimbi fișierele din shell, crește versiunea cache-ului din `sw.js`.
- Datele stau **local în browser** (IndexedDB / localStorage). Conturile și sincronizarea în cloud vin mai târziu.

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
