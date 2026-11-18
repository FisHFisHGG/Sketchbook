// Update 11: turning pages in a big notebook (a PDF with many pages).
// - opening a notebook far inside: the cover opens, most pages are skipped, only the last 2 turn
// - the pages stacked behind are plain paper (no big pictures, no filters), a picture that's already there isn't loaded again,
//   and the turning page lies exactly on the page when it starts and when it lands
// - a new device: pages still coming from the cloud show "Loading page…" (not a blank page) and appear when they arrive;
//   such a page can't be opened for drawing; a blank page on a device never replaces a page in the cloud
// - All pages: only the pictures near the screen are loaded
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node update11-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SITE=path.join(__dirname,'..'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.json':'application/json'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
const N=120,AT=40; // pages in the big notebook; it was left open at spread 40 (pages 81–82)
(async()=>{
  require('http').createServer((q,res)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!u.startsWith('/Sketchbook/')){res.writeHead(404);return res.end()}
    let f=path.join(SITE,u.slice('/Sketchbook/'.length));if(u.endsWith('/'))f=path.join(f,'index.html');
    if(f.startsWith(SITE)&&!/^(firebase|\.git)\b|CLAUDE/.test(path.relative(SITE,f))&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});return res.end(fs.readFileSync(f))}
    res.writeHead(404,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(SITE,'404.html')))}).listen(5194,'127.0.0.1');
  const b=await chromium.launch();
  const URL0='http://127.0.0.1:5194/Sketchbook/app/?emu=127.0.0.1';
  const dev=async name=>{const ctx=await b.newContext({viewport:{width:1100,height:800},...(process.env.VIDEO&&name==='A'?{recordVideo:{dir:process.env.VIDEO,size:{width:1100,height:800}}}:{})});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
    const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(name+': '+e.message));await p.goto(URL0);return p};
  const ready=p=>p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});
  const signIn=async(p,em,create)=>{await p.waitForSelector('#a-em',{timeout:15000});if(create)await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');await ready(p);await answerSurvey(p);await p.waitForTimeout(500)};
  const setPro=async(uid,on)=>{if(on)await admin('pro/'+uid,{fields:{by:{stringValue:'admin'},since:{timestampValue:new Date().toISOString()},days:{integerValue:'0'}}});else await admin('pro/'+uid,null,'DELETE')};
  const settle=async p=>{await p.waitForTimeout(600);await p.waitForFunction(()=>!ACC.busy,null,{timeout:60000});await p.evaluate(()=>syncRun());await p.waitForFunction(()=>!ACC.busy,null,{timeout:60000});await p.waitForTimeout(300)};

  // ---- device A (Pro): a notebook with 120 pages, like an imported PDF, left open at pages 81–82
  const A=await dev('A');await signIn(A,'pia11@example.com',true);const uid=await A.evaluate(()=>ACC.user.uid);
  await setPro(uid,true);await A.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  await A.evaluate(async([n,at])=>{
    const pic=i=>{const k=document.createElement('canvas');k.width=450;k.height=600;const x=k.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,450,600);x.fillStyle='#222';x.font='bold 120px sans-serif';x.textAlign='center';x.fillText(String(i+1),225,330);return k.toDataURL('image/jpeg',.6)};
    const bk=mk('Big book',data.length,'p');bk.pages=[];for(let i=0;i<n;i++){bk.pages.push(null);bk.bg[i]=pic(i)}bk.cs=at;data.push(bk);persist();await saveNow();renderShelf()},[N,AT]);
  await settle(A);
  ok(await A.evaluate(n=>Object.keys(ACC.man).filter(k=>k.startsWith('p~')).length>=n,N),'A: the 120-page notebook is in the cloud');

  // ---- opening it: the cover opens, then only the last 2 pages turn
  await A.evaluate(()=>{window._flips=0;const f0=flip;flip=function(...a){window._flips++;return f0.apply(this,a)};
    window._rf=0;(function w(){window._rf=Math.max(window._rf,document.querySelectorAll('#sp .rf').length);requestAnimationFrame(w)})()}); // how many riffling pages fly at once
  const t0=Date.now();await A.evaluate(()=>showBrowse(data.find(x=>x.title==='Big book')));
  await A.waitForFunction(at=>cs===at&&!flipping,AT,{timeout:20000});const took=Date.now()-t0;
  const fl=await A.evaluate(()=>window._flips),rf=await A.evaluate(()=>window._rf);
  ok(fl===3&&rf===7&&took<5500,'opening it at pages 81–82: the cover opens, '+rf+' light pages riffle over, then 2 page turns ('+fl+' turns, '+(took/1000).toFixed(1)+' s) – not 40 turns');
  ok(await A.evaluate(()=>!document.querySelector('#sp .rf')),'… and the riffling pages are gone afterwards');
  if(process.env.SHOT)await A.screenshot({path:process.env.SHOT+'/book.png'});
  ok(await A.evaluate(()=>$('#bpg').textContent==='Pages 81–82 of 120'),'… and it’s at pages 81–82');
  // lighter for tablets
  ok(await A.evaluate(()=>{const d=[...document.querySelectorAll('#sp .dk')];return d.length===8&&d.every(x=>!x.querySelector('img')&&!x.style.filter)}),'the pages stacked behind are plain paper: no pictures, no filters');
  ok(await A.evaluate(()=>getComputedStyle($('#sp'),'::before').filter==='none'),'the shadow under the book has no blur filter');
  const same=await A.evaluate(()=>{const a=$('#pl img'),b2=$('#pr img');renderBrowse();return a===$('#pl img')&&b2===$('#pr img')});
  ok(same,'drawing the spread again keeps the pictures that are already there (no blank flash)');
  // a turn: the leaf lies exactly on the page (coplanar) and the page under it is ready before the leaf goes away
  const leaf=await A.evaluate(()=>new Promise(res=>{flip(cs+1,400);const z=$('#fl').style.transform;const t=()=>{if(!flipping)res({z,pl:!!$('#pl img'),pr:!!$('#pr img'),bpg:$('#bpg').textContent});else requestAnimationFrame(t)};t()}));
  ok(/translateZ\(-\d+(\.\d+)?px\)/.test(leaf.z)&&leaf.pl&&leaf.pr&&leaf.bpg==='Pages 83–84 of 120','a turn: the leaf starts and lands exactly on the page, and both pages show their pictures at the end');
  // All pages: only the pictures near the screen
  await A.click('#bgrid');await A.waitForTimeout(800);
  const ov=await A.evaluate(()=>({th:document.querySelectorAll('#ovg .th').length,img:document.querySelectorAll('#ovg .tp img').length}));
  ok(ov.th===N+1&&ov.img>0&&ov.img<N,'All pages: '+ov.th+' pages listed, only '+ov.img+' pictures loaded (the ones near the screen)');
  await A.evaluate(()=>{const g=$('#ovg');const last=g.querySelector('.th:last-child');last.scrollIntoView({block:'center'})});await A.waitForTimeout(800);
  ok(await A.evaluate(()=>!!document.querySelector('#ovg .th:last-child .tp img')),'… scrolling down loads the others');
  await A.click('#ovg .th:nth-child(3)');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>document.querySelector('#ovg .th:nth-child(3)').getAttribute('aria-pressed')==='true'&&!!document.querySelector('#ovg .th:last-child .tp img')),'choosing a page only marks it (the pictures stay)');
  await A.click('#ovx');await A.evaluate(()=>closeBook());await A.waitForTimeout(400);

  // ---- device B, new: pages still on their way show "Loading page…", then appear
  await setPro(uid,false);await A.waitForFunction(()=>!ACC.pro,null,{timeout:15000});
  const B=await dev('B');await signIn(B,'pia11@example.com',false);
  await B.evaluate(()=>{const p0=pullRec;pullRec=async k=>{if(k.startsWith('p:'))await new Promise(r=>setTimeout(r,90));return p0(k)}}); // a slow connection
  await setPro(uid,true);await B.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  await B.waitForFunction(()=>data.some(x=>x.title==='Big book'),null,{timeout:30000});
  await B.evaluate(()=>{const bk=data.find(x=>x.title==='Big book');showStore(false);showBrowse(bk)});
  await B.waitForFunction(()=>cur&&cs===cur.cs&&cs>=40&&!flipping,null,{timeout:20000});
  const ld=await B.evaluate(()=>({pl:$('#pl').classList.contains('ld'),pr:$('#pr').classList.contains('ld'),txt:getComputedStyle($('#pl'),'::after').content,img:!!$('#pl img')}));
  if(process.env.SHOT)await B.screenshot({path:process.env.SHOT+'/loading.png'});
  ok(ld.pl&&ld.pr&&/Loading page/.test(ld.txt)&&!ld.img,'B (new tablet), notebook opened while it syncs: the pages say “Loading page…” instead of being blank');
  await B.click('#pr');await B.waitForTimeout(400);
  ok(await B.evaluate(()=>$('#ed').classList.contains('hidden')&&/still loading/.test(($('#sv').textContent||''))),'a page still loading can’t be opened for drawing (“This page is still loading…”)');
  await B.waitForFunction(()=>!$('#pl').classList.contains('ld')&&!!$('#pl img')&&!!$('#pr img'),null,{timeout:60000});
  ok(true,'… and the pages appear by themselves as soon as they arrive');
  await B.evaluate(()=>closeBook());await settle(B);
  ok(await B.evaluate(n=>{const bk=data.find(x=>x.title==='Big book');return bk.pages.length===n&&bk.bg.filter(Boolean).length===n},N),'B: all 120 pages arrived');

  // ---- a blank page never replaces a page in the cloud
  await B.evaluate(()=>syncStop()); // B is offline for a moment
  await A.evaluate(async()=>{const bk=data.find(x=>x.title==='Big book');const k=document.createElement('canvas');k.width=450;k.height=600;const x=k.getContext('2d');x.fillStyle='#c33';x.fillRect(0,0,450,600);bk.pages.push(null,null);bk.bg[bk.pages.length-2]=k.toDataURL('image/jpeg',.6);persist();await saveNow()});
  await setPro(uid,true);await A.waitForFunction(()=>ACC.pro,null,{timeout:15000});await settle(A);
  await B.evaluate(async()=>{const bk=data.find(x=>x.title==='Big book');bk.pages.push(null,null);persist();await saveNow()}); // B adds 2 blank pages at the same place
  await B.evaluate(()=>syncStart());await B.waitForTimeout(1500);await settle(B);
  const kept=await B.evaluate(n=>{const bk=data.find(x=>x.title==='Big book');return !!bk.bg[n]},N);
  const cloud=await A.evaluate(async n=>{await syncRun();const bk=data.find(x=>x.title==='Big book');return !!bk.bg[n]},N);
  ok(kept&&cloud,'A drew on a new page, B added blank pages there before syncing: A’s page wins on both devices (a blank page never replaces it)');

  [...A.errs,...B.errs].forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
