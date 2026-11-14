# Foliet Sketchbook

Caiete realiste în browser: desen, scris și planificare, cu pagini care se întorc ca la un caiet adevărat.

## Structura

```
index.html                 pagina de prezentare (landing)
app/index.html             aplicația
app/manifest.webmanifest   datele pentru instalare pe telefon (PWA)
app/sw.js                  funcționare offline
app/icon-*.png             iconițele aplicației
app/fonts/                 fonturile, incluse în proiect
app/vendor/pdfjs/          biblioteca pentru importul PDF
app/vendor/firebase.js     Firebase (conturi + cloud)
firebase/                  regulile de securitate Firebase
netlify.toml               configurarea Netlify
og.png                     imaginea afișată când distribui linkul
robots.txt, sitemap.xml    pentru motoarele de căutare
.nojekyll                  îi spune lui GitHub Pages să publice fișierele exact cum sunt
.github/workflows/pages.yml  publicarea automată
CLAUDE.md                  regulile proiectului
```

## Publicare

Până la lansare, site-ul e pe **GitHub Pages**: `https://fishfishgg.github.io/Sketchbook/` (se publică singur la fiecare push pe `main`, vezi `.github/workflows/pages.yml`; Settings → Pages → Source: **GitHub Actions**).
La lansare se mută pe **Netlify** (fără build, vezi `netlify.toml`).

Datele utilizatorilor stau deocamdată doar pe dispozitivul lor (IndexedDB). Din Settings pot face o copie de siguranță (.json). Cu un cont Pro, caietele se sincronizează și în cloud (Firebase). Plățile urmează.
