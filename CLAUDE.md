# Foliet Sketchbook – regulile proiectului

**Foliet Sketchbook** (marca: **Foliet**, descriptorul „Sketchbook” stă mereu lângă nume) este o aplicație de desen în browser, cu caiete 3D (landing + aplicație). Acum suntem în **beta**; lansarea publică = versiunea **1.0**.
- Titluri: landing „Foliet Sketchbook – a digital sketchbook that opens in your browser”; în aplicație tab-ul arată „Foliet Sketchbook”, iar cu un caiet deschis „<nume caiet> – Foliet Sketchbook” (`docTitle()`). Logo-ul de pe landing: „Foliet” + mic „Sketchbook”.
Găzduire: **GitHub Pages până la 1.0** (`https://fishfishgg.github.io/Sketchbook/`, aplicația la `app/`), apoi **Netlify** (`netlify.toml` e pregătit). La mutare schimbă adresa în: `index.html` (canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD), `robots.txt`, `sitemap.xml`; și adaugă domeniul în Firebase → Authentication → Authorized domains. Repo-ul se numește încă `Sketchbook`.

## Cum lucrezi cu mine (utilizatorul)
- Răspunde-mi mereu în **română**, simplu; nu sunt programator.
- Interfața aplicației (și a landing-ului) rămâne în **engleză**.
- După fiecare schimbare, spune-mi pe scurt **ce s-a schimbat** și **unde văd rezultatul**.

## Structura
```
index.html                 landing (pagina de prezentare)
privacy.html, terms.html   politica de confidențialitate și termenii (GDPR); au locuri goale [ … ] de completat
app/index.html             aplicația
app/sw.js                  service worker (funcționare offline)
app/manifest.webmanifest   PWA (instalare pe telefon)
app/icon-*.png             iconițe
app/favicon.svg            iconița cu caietul albastru (tab-ul browserului, landing)
app/fonts/                 fonturile (locale, fără Google Fonts – GDPR + offline)
app/vendor/pdfjs/          pdf.js 3.11.174 pentru importul PDF (local, offline)
app/vendor/firebase.js     Firebase JS SDK 11.10.0 (app + auth + firestore), un singur fișier (window.FB)
firebase/firestore.rules   regulile de securitate Firestore (se lipesc în consola Firebase)
firebase/storage.rules     Storage blocat complet (nu-l folosim)
firebase/*-test.js         teste cu simulatorul Firebase (vezi mai jos)
og.png                     imaginea de previzualizare a site-ului (link-uri distribuite)
robots.txt, sitemap.xml    pentru motoarele de căutare (aplicația app/ are noindex; landing-ul e indexat)
netlify.toml               configurarea Netlify (fără build, publică rădăcina)
.github/workflows/pages.yml  publică pe GitHub Pages la push pe main (doar index.html, privacy.html, terms.html, og.png, robots.txt, sitemap.xml, .nojekyll, app/)
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
  - Fiecare caiet și fiecare pagină e o înregistrare separată: `v2:idx` (ordinea caietelor), `v2:b:<id>` (caietul fără pagini), `v2:p:<id>:<i>` (o pagină), `v2:trash` (Recently deleted). Se scrie doar ce s-a schimbat (`writeDiff()`); `persist()` programează salvarea.
  - **Caietele nu trebuie să dispară niciodată (Update 7):**
    - nu se scrie nimic cât timp biblioteca se încarcă sau e închisă (`LIBST.ready`);
    - înregistrările unui caiet se șterg **doar** după 30 de zile în **Recently deleted** (`TRASH`, `trashBook()`, `restoreTrash()`, butonul `#trashb` de sub raft) sau pentru caietul de început lăsat deoparte de un dispozitiv nou (`LIBST.purge`);
    - un caiet care are înregistrări pe dispozitiv dar lipsește din listă **revine singur** la pornire (`loadV2()`, mesaj „…are back on your shelf”);
    - mai multe ferestre ale aplicației: după ce alta a salvat, raftul se reîncarcă la întoarcere (`LIBCH`, `reloadLib()`).
    - **Șterge un caiet doar cu `trashBook(b)`**, niciodată cu `data.filter(...)` direct – altfel el revine la următoarea pornire (sau din cloud).
  - `savePage()` codează desenul în fundal (`canvasURL()`); înainte de a schimba ordinea paginilor, așteaptă `savesDone()` și crește `cur._sv`.
  - Proprietățile care încep cu `_` nu se salvează.
  - La ieșirea din aplicație se salvează imediat (`saveOnLeave()`). Settings are backup/restaurare (.json) și cere stocare permanentă.
- Undo: ultimul pas e o imagine întreagă, cei vechi doar dreptunghiul schimbat (`histAdd()`), până la 60 de pași / 60 MB.
- **Updates** (Settings → What’s new): lista `UPDATES` din `app/index.html`. Acum suntem în **beta** (`APP_VER='Beta'`) și lista e **goală**. Începând cu **versiunea 1.0**, la fiecare lansare: pune `APP_VER` la versiunea nouă și adaugă **sus** în `UPDATES` `{v:'1.0', date:'AAAA-LL-ZZ', items:['…']}` (texte în engleză). O versiune nouă aprinde un punct roșu pe butonul Settings până e citită.
- **Caietul de bun venit** (`makeWelcome()`): orice bibliotecă nouă începe cu el – copertă + 6 pagini care prezintă funcțiile (unelte, fonturi, autocolante, stiluri de pagină, modele de copertă, șabloane, blocare, backup, Pro). Are `b.welcome=1`, **nu intră în limita Free** (`ownBooks()`), iar cât timp nu e editat (`b.u===b.wu`) un dispozitiv nou îl lasă deoparte în favoarea celui din cloud. Când adaugi o funcție importantă, adaug-o și aici, și pe landing.
- **Temă luminoasă / întunecată**: la început urmează setarea dispozitivului. Butonul soare/lună (pe landing în bara de sus, în aplicație lângă meniu și pe ecranul de logare) trece la cealaltă temă; dacă alegerea ajunge la fel ca a dispozitivului, se salvează ca „auto”. Alegerea e comună landing + aplicație (`sb-set` → `theme`: auto/light/dark; în aplicație `toggleTheme()`, `setTheme()`, `syncThemeBtns()`). Landing-ul aplică tema printr-un mic script în `<head>`, înainte să se deseneze pagina.
- **Meniul ☰** de pe ecranul cu caiete (`#menu`, `initMenu()`): contul (email + plan), Account & promo code, Theme (Auto/☀/☾), What’s new (punct roșu la versiune nouă), Settings, Send feedback, Help & shortcuts, Privacy & terms, Admin panel (doar admin), Sign out. Funcțiile noi de cont/setări intră aici.
- **Copertă**: culoare + textură (`TEX`) + model (`DES`, `b.design`; lista din magazin e `COVERS`: 16 gratuite + 6 plătite), pictate împreună de `covImg()`/`paintCover()` (pe raft, în editor, la export). Cover style → Design arată doar modelele gratuite + cele cumpărate (`buildDes()`).
- **Poza pe copertă = Pro** (`coverPhotoPro()`): butonul foto pe copertă sau Cover style → Photo pune poza ca **fundal al copertei** (`b.cbg`, sub desen, ca să poți desena peste ea); „Remove photo” o scoate. La Free apare fereastra Pro. Prima pagină a unui PDF importat devine tot `cbg`. Pozele pe pagini rămân gratuite.
- **Etichete (labels)**: numele de pe copertă e un obiect pe care îl muți/redimensionezi/rotești: `{k:'img', src, lb:{id, t}}`, desenat de `lblDraw()`/`labelURL()`. 6 forme gratuite (Classic, Small, Big, Long strip, Tall, Oval) + 6 stiluri plătite (Kraft tag, Washi tape, Chalkboard, Gold foil, Ribbon, Vintage) – lista `LABELS`. Se adaugă din + → Labels; ✎ schimbă textul (`editLabel()`). Prima dată când editezi o copertă goală, eticheta automată (`.lbl` de pe raft) devine obiect (`ensureCoverLabel()`, `b.lbl0`). La redenumirea caietului, etichetele care arătau vechiul nume se schimbă singure (`relabel()`).
- **Landing – caietul din dreapta sus** (`#hb`), ca un caiet adevărat: închis → se deschide coperta (pe interior „this sketchbook belongs to Ana”, pagina „Hello!”) → album foto pe hârtie bej (poze cu ramă albă, scris și date) → desene → agendă → **se închide** → o ia de la capăt. **Fără pagini negre.** Se oprește când nu e pe ecran; cu „reduce motion” arată doar albumul.
- **Feedback** (meniu → „Send feedback”, `openFeedback()`): `feedback/{id}` = `{uid,email,type: idea|problem|other,text,reply,os,ver,w,at,done?}`, max. un mesaj pe minut de pe un dispozitiv (`sb-fbt`). Se citește în panoul de admin (filtru pe tip, „Mark done”, „Reply” pe email dacă omul a permis).
- **Datele tale (GDPR)** – în fereastra de cont: „Download my data” (`downloadMyData()`: cont + profil + răspuns + Pro + șabloane + feedback + caiete, un .json) și „Delete my account” (`deleteAccount()`: confirmă parola/Google, șterge copia din cloud, profilul, activitatea, răspunsul, feedback-ul, Pro, șabloanele, opțional și caietele de pe dispozitiv, apoi contul). Ecranul de logare are „By continuing, you agree to our Terms of Use and Privacy Policy”. Când adaugi o colecție nouă cu date despre om, adaug-o și în `myRecords()`, `deleteAccount()`, în regulile de ștergere și în `privacy.html`.
- **Import PDF** (Pro): max. **500 de pagini** pe PDF (`PDF_MAX`, ~200 KB/pagină → ~100 MB la 500), cu buton Cancel și salvare din 25 în 25 de pagini. **Prima pagină din PDF devine coperta** (o poză pe copertă, `b.cobjs`), restul devin paginile caietului.
- **Magazinul** (tab-ul **Store**, `renderTpl()`, secțiuni `SKINDS`: Templates · Covers · Labels · Stickers): tot ce e plătit costă **€0.99 bucata, pentru toți** (și pentru Pro), plătit o dată și folosit oricât. Fiecare articol are `id`, `n`, `p` (prețul în cenți); `itemById()`, `ownsItem()`, `itemName()`. Coperțile/etichetele deținute au fereastra „✓ You own this …” cu „Use/Add” pe un caiet (`useCover()`, `addLabelTo()`); stickerele apar în + → Stickers, pe pachete (`STPK`), **fiecare pachet are exact 7 stickere**: gratuite – Basics, Notes & marks, Tags & tape, Days out, Doodles, Study desk; plătite – Cute animals, Space, Sweet treats. Pentru pachete noi de stickere: 7 fișiere în proiect (sau SVG) + o intrare în `STPK`.
- **Șabloanele** (`TPL`, `tplPage()` desenează paginile): 8 gratuite + 9 plătite (`g` = categoria, `des` = modelul copertei). Un clic pe un șablon pe care îl ai (`ownedTpl()`) arată „✓ You own this template / Free template” și oferă: **caiet nou** din el (`useTpl()`) sau **adaugă pagini** (1–10) la sfârșitul unui caiet existent (`addTplToBook()`, cere PIN-ul dacă e blocat, respectă limita Free de pagini).
- **Șabloanele sunt stil de pagină**: o pagină-șablon are `ps[i] = {p:'tpl', t:id, k:numărul (Week 1, 2…), c:hârtia}` și `bg[i]` = liniile șablonului pe fundal transparent, desenate pentru orientarea caietului (`tplPages()`, `tplBgURL()`); pe hârtie închisă liniile se desenează deschise. Șabloanele pe care le ai apar în: **New notebook** (după portret/peisaj: Blank/Lined/Grid/Dots sau un șablon, cu nota că se poate schimba din Page style), **New pages** („Like the last page” continuă șablonul) și **Page style** (pagina trece la alt șablon sau înapoi la Blank/Lined/…). Paginile dintr-un PDF își păstrează PDF-ul. Ce are omul (pentru toate tipurile din magazin): `owned/{uid}` = `{t:[id-uri | 'all'], last}` (ascultat în `accUser()`, ținut și pe dispozitiv în `sb-own:<uid>` pentru offline; `ownsTpl()`). Vânzarea nu e pornită (`TPL_SALE=false`): „Buy for €0.99” spune că vine curând; până atunci șabloanele se dau prin **coduri de șablon** sau din panoul de admin. Când pornesc plățile: Stripe (plată unică) → scrie în `owned/{uid}`.
- **Culoarea hârtiei** (Page style → Paper color, `PAPERN`): Paper white (implicit, `PAPER`), Bright white, Warm white (mai odihnitor pentru ochi), Cream, Light gray, Light blue, Mint, Blush, Dark gray, Black + orice culoare (`#pcpk`); numele culorii alese apare lângă titlu. Pe hârtie închisă pixul negru devine alb, iar înapoi pe hârtie deschisă redevine negru (`setPS()`).
- **Paginile noi** („New pages”): fereastra `#npd` întreabă cum arată (ca ultima pagină, goale, cu linii, pătrățele, puncte); culoarea hârtiei rămâne.
- **Caiete blocate** (gratuit, pe toate planurile): `b.lock={t:'pin'|'pw',s,i,h}` (PBKDF2), se sincronizează cu caietul. Butonul lacăt din bara caietului (`lockSettings()`); deschiderea trece prin `unlockBook()`. Pe raft, coperta unui caiet blocat nu-și arată desenul, iar paginile lui nu apar în căutare. La ieșirea în fundal se blochează din nou. **Doar pe Android** există și amprenta (WebAuthn cu cititorul telefonului, credențial doar pe acel telefon: `sb-bio:<uid>`, `sb-bioon:<uid>`). „Forgot the PIN?” → confirmă contul (parola sau Google) → lacătul se scoate. E o protecție în aplicație, nu criptarea fișierelor – nu promite mai mult de atât.
- Planul Pro nu se poate cumpăra încă. `plan` = 'pro' dacă contul are Pro (real) sau, doar local, cu `app/?demo=pro` (`?demo=free` ca să revii). Demo-ul nu pornește sincronizarea.

## Conturi și cloud (Firebase, proiect `sketchbook-b1de1`)
- **Contul e obligatoriu.** Aplicația pornește pe ecranul de logare (`startApp()` → `showGate()`, `#acct.gate`); Google + email/parolă. Prețurile/reducerea: anualul economisește **37%** – nu scrie alt procent fără să schimbi prețurile (și să mă întrebi).
- Fiecare cont are caietele lui pe dispozitiv (`openLibrary(uid)`): primul cont logat pe dispozitiv (`sb-owner`) preia caietele existente (prefix `v2:`), celelalte au prefix `v2u:<uid>:`. La deconectare caietele se ascund (`closeLibrary()`), nu se șterg.
- Offline: cine a fost logat ultima dată (`sb-last-uid`) poate lucra și fără internet; un dispozitiv nou are nevoie de internet pentru logare.
- Pro real = custom claim `stripeRole == 'pro'` (viitoarea extensie Stripe) **sau** documentul `pro/{uid}` = `{by, since, days, code?}` (`days` 0/lipsă = pentru totdeauna; Pro din cod/admin expiră singur – `proActiveDoc()`, iar regulile verifică la fel). Se creează din consolă, din panoul de admin sau prin cod promoțional. Regulile nu permit nimănui să-și dea singur Pro.
- **Întrebarea „How did you find Foliet?”** (`checkSurvey()` / `askSurvey()`): apare o singură dată după crearea contului (și o dată conturilor mai vechi), **nu se poate închide sau sări** (fără ✕, fără Escape, fără clic pe lângă). Variante: YouTube, Instagram, Facebook, An AI assistant, Somewhere else (cu text obligatoriu, min. 2 caractere – verificat și de reguli). Se salvează în `survey/{uid}` = `{src, other, at}`; fără internet, răspunsul așteaptă pe dispozitiv (`sb-src:<uid>:p`) și se trimite mai târziu. Variantele noi se adaugă în `SRC` **și** în regulile Firestore.
- **Coduri promoționale**: `codes/{COD}` = `{kind:'pro', days, max, used, active, note}` sau, pentru șabloane, `{kind:'tpl', tpl: id | 'all', max, used, active, note}` (tranzacția scrie atunci `owned/{uid}` = `{t:[…, tpl], last: COD}`; regulile verifică să fie exact șablonul din cod). Utilizatorul îl scrie în fereastra de cont (sau din „Have a promo code?” din fereastra Pro); `redeemCode()` face o tranzacție: `pro/{uid}` + `codes.used+1` + `redeem/{uid_COD}` – regulile verifică totul (cod activ, locuri libere, aceleași zile, o singură folosire de persoană). **Codurile de reducere** (ex. prima lună/primul an mai ieftin) se fac în Stripe la pasul cu plățile.
- **Panou de admin** (`openAdmin()`, din meniu → „Admin panel”): pentru conturile din `admins/{uid}` (create de mână în consolă). Încarcă totul o dată (`adminFetch()`), apoi `adminRender()` arată pentru perioada aleasă (`ADM.per`: All time / This year / This month / orice an sau lună din listă):
  - **Bani** (din datele extensiei Stripe: `customers/{uid}/payments` și `subscriptions`, citite cu collectionGroup): venit, plăți, clienți plătitori, abonamente active (lunar/anual), venit lunar estimat (MRR), medie pe client. Fără Stripe arată €0 și o notă.
  - **Conturi**: total, noi, active (din `act/{YYYY-MM_uid}`, o înregistrare pe lună pe cont), Pro acum (cod/admin/consolă **plus** abonații Stripe, fiecare o dată), Pro început, coduri folosite.
  - **Grafice**: conturi noi și venit, pe luni (an / toată perioada, max. 24 de luni) sau pe zile (o lună).
  - **Cine folosește**: Google vs email, dispozitiv, aplicație instalată, limbă (pentru conturile din perioadă).
  - **How people found Foliet**: procente pe surse (răspunsurile din perioadă), câte conturi n-au răspuns încă și toate textele de la „Somewhere else” (cu data și emailul). Răspunsul e și în CSV (`found_via`).
  - **Feedback**: mesajele din perioadă, filtru pe tip, câte nu sunt rezolvate, „Mark done”/„Reopen”, „Reply”.
  - Coduri (Pro sau șablon; creare/oprire/ștergere, folosiri în perioadă), membri Pro (dă/scoate după email), **Templates** (câți au șabloane plătite, pe fiecare șablon, „Give template” după email), căutare cont după email + „Download all (CSV)” (cu coloana `templates`).
  - Statisticile vin din `profiles/{uid}` = `{email,name,via,os,lang,app,created,seen}` (scris de fiecare cont cam o dată pe zi, `touchProfile()`). Adminul **nu** vede caietele nimănui. Încărcarea citește toate profilurile – bine pentru mii de conturi; la foarte multe, trece pe interogări de numărare/sumă.
- Sincronizare (doar Pro): `users/{uid}` are manifestul `m.{record} = {h, n}`; `users/{uid}/r/{record}` (+ `~~1`, `~~2`…) conține înregistrarea ca JSON, în bucăți de 300.000 caractere. Înregistrările sunt aceleași ca local (`idx`, `b:<id>`, `p:<id>:<i>`, cu `:` → `~`).
- `syncOnce()` compară 3 hash-uri (dispozitiv, cloud, ultima sincronizare salvată în IDB la `sync:<uid>`): schimbat doar aici → trimite; doar în cloud → aduce; pe ambele → câștigă dispozitivul. Ordinea caietelor se combină. Caietul deschis se actualizează după ce e închis. **Siguranță:** un caiet e scos din cloud doar dacă l-ai șters (e în Recently deleted); un caiet care lipsește pe dispozitiv fără să fi fost șters e **adus înapoi din cloud**; un caiet șters pe alt dispozitiv ajunge în Recently deleted aici (se poate restaura).
- Doar Pro poate scrie în cloud (protecție de costuri). Dacă Pro expiră, utilizatorul își poate încă citi datele.
- **Costul utilizatorilor gratuiți** e aproape zero: caietele lor stau doar pe dispozitiv; în cloud scriu doar profilul (~1/zi), activitatea (1/lună), răspunsul la întrebare (1 dată), feedback și ce au cumpărat. La o deschidere a aplicației se fac ~3–4 citiri mici (Pro, șabloane, admin). Planul gratuit Firebase (50.000 citiri + 20.000 scrieri pe zi, 1 GB) ajunge pentru mii de utilizatori pe zi. Nu muta caietele gratuite în cloud.
- Teste cu simulatorul Firebase (în `firebase/`, `npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node <test>.js"`): `sync-test.js` (două dispozitive), `gate-test.js` (logare obligatorie, conturi separate, offline), `features-test.js` (caiet de bun venit, meniu și temă, coduri, reguli, admin cu perioade/bani/CSV, întrebarea de după cont, Pro care expiră, blocare, pagini noi), `fingerprint-test.js` (amprenta pe Android, cu cititor virtual), `update7-test.js` (caietele nu dispar: revin la pornire, două ferestre, nimic scris în timpul încărcării, Recently deleted 30 de zile, sincronizarea aduce înapoi în loc să șteargă), `update6-test.js` (feedback, magazinul – șabloane, coperți, etichete, stickere –, codurile din magazin, poza pe copertă doar Pro, etichetele mobile, șabloanele în caiete – caiet nou, pagini noi, Page style –, eticheta copertei la întoarcere, modele de copertă, culorile hârtiei, import PDF cu coperta, descărcarea datelor, ștergerea contului). Aplicația se leagă de simulator cu `app/?emu=127.0.0.1` (doar pe localhost). După orice schimbare la reguli/conturi/sincronizare, rulează-le pe toate.
- **Regulile din `firebase/firestore.rules` trebuie lipite în consola Firebase de fiecare dată când se schimbă** – spune-i utilizatorului.

## Planuri
| | Free | Pro |
|---|---|---|
| Caiete | 2 | nelimitat |
| Pagini / caiet | 20 | nelimitat |
| Straturi / pagină | 2 | 8 |
| Caiete blocate (PIN/parolă, amprentă pe Android) | da | da |
| Import PDF (max. 500 pagini/PDF) | – | da |
| Poză pe copertă (desenezi peste ea) | – | da |
| Etichete pe copertă (6 forme), coperți (16), 6 pachete de stickere gratuite | da | da |
| Magazin (șabloane, coperți, etichete, pachete de stickere) | gratuitele + restul €0.99 bucata | la fel (€0.99 bucata) |
| Export PDF / PNG | – | da |

Prețuri Pro: **€3.99 / lună** și **€29.99 / an**. Articole plătite din magazin (șabloane, coperți, etichete, pachete de stickere): **€0.99 bucata**. **Nu le schimba fără să mă întrebi.**

## Urmează
1. ~~Conturi + cloud~~ (gata: Firebase)
2. ~~Pagini legale (GDPR)~~ (gata: `privacy.html`, `terms.html`, descărcare date, ștergere cont) – **înainte de lansare** utilizatorul completează locurile goale `[YOUR NAME OR COMPANY]`, `[COUNTRY]`, `[CONTACT EMAIL]` și verifică că Firestore e în `europe-west3` (Frankfurt), cum scrie în politică
3. Plăți (Stripe, prin extensia „Run Payments with Stripe” pentru Firebase → setează `stripeRole`; plus plata unică de €0.99 pentru șabloane → `owned/{uid}`, apoi `TPL_SALE=true`)
4. Publicare Android prin PWA
