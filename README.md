# Sketchbook

Caiete realiste în browser: desen, scris și planificare, cu pagini care se întorc ca la un caiet adevărat.

## Structura

```
index.html                 pagina de prezentare (landing)
app/index.html             aplicația
app/manifest.webmanifest   datele pentru instalare pe telefon (PWA)
app/sw.js                  funcționare offline
app/icon-*.png             iconițele aplicației
.nojekyll                  îi spune lui GitHub Pages să publice fișierele exact cum sunt
.github/workflows/pages.yml  publicarea automată
CLAUDE.md                  regulile proiectului
```

## Publicare

Site-ul se publică automat prin GitHub Actions (`.github/workflows/pages.yml`) la fiecare push pe `main`.

Settings → Pages → Build and deployment → Source: **GitHub Actions**.

Adresa va fi: `https://<utilizator>.github.io/Sketchbook/`

Datele utilizatorilor stau deocamdată doar pe dispozitivul lor (IndexedDB). Conturile, sincronizarea și plățile urmează.
