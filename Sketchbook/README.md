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
```

## Publicare

Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save.

Adresa va fi: `https://<utilizator>.github.io/Sketchbook/`

Datele utilizatorilor stau deocamdată doar pe dispozitivul lor (IndexedDB). Conturile, sincronizarea și plățile urmează.
