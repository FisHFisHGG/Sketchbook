// Update 11: turning pages in a big notebook (a PDF with many pages).
// - opening a notebook far inside: the cover opens, most pages are skipped, only the last 2 turn
// - the pages stacked behind are plain paper (no big pictures, no filters), a picture that's already there isn't loaded again,
//   and the turning page lies exactly on the page when it starts and when it lands
// - a new device: pages still coming from the cloud show "Loading page…" (not a blank page) and appear when they arrive;
//   such a page can't be opened for drawing; a blank page on a device never replaces a page in the cloud
// - All pages: only the pictures near the screen are loaded
// - the open book fits between the bars and sits in the middle: a computer shows it a bit further back, a phone as big as fits;
//   zoom stays between the bars too
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
  const dev=async(name,o={})=>{const ctx=await b.newContext({viewport:{width:1100,height:800},...o,...(process.env.VIDEO&&name==='A'?{recordVideo:{dir:process.env.VIDEO,size:{width:1100,height:800}}}:{})});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
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
  // the open book fits between the bars and sits in the middle; a computer shows it a bit further back
  const fitOf=p=>p.evaluate(()=>{const m=$('#bmain').getBoundingClientRect(),l=$('#pl').getBoundingClientRect(),r=$('#pr').getBoundingClientRect(),bb=$('#bv .bar.bot').getBoundingClientRect(),pt=thick().pt;
    const top=Math.min(l.top,r.top),bot=Math.max(l.bottom,r.bottom)+pt*.42;return {gt:Math.round(top-m.top),gb:Math.round(m.bottom-bot),fill:Math.round((bot-top)/m.height*100),under:bot<=bb.top+1}});
  const f1=await fitOf(A);
  ok(f1.gt>8&&f1.gb>8&&Math.abs(f1.gt-f1.gb)<=4&&f1.fill>=80&&f1.fill<=90,'a computer: the open book is in the middle, a bit back from the bars (gap '+f1.gt+' / '+f1.gb+' px, '+f1.fill+'% of the height)');
  await A.click('#bzoom');await A.waitForTimeout(500);
  const z1=await A.evaluate(()=>{const bb=$('#bv .bar.bot').getBoundingClientRect(),t=$('#bv .bar').getBoundingClientRect(),l=$('#pl').getBoundingClientRect();return l.bottom<=bb.top&&l.top>=t.bottom&&l.height>$('#sp').offsetHeight});
  await A.evaluate(()=>resetZoom());
  ok(z1,'zoom: the page gets bigger and still stays between the bars');
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
  await A.click('#ovx');await A.waitForTimeout(300);
  // drawing on a PDF page: the ink shows in the editor (over the page's picture), not only in the book
  await A.evaluate(()=>showEditor(cs*2+1));await A.waitForTimeout(900);
  const box=await A.locator('#paper').boundingBox(),y=box.y+box.height*.15;
  await A.mouse.move(box.x+box.width*.15,y);await A.mouse.down();await A.mouse.move(box.x+box.width*.85,y,{steps:14});await A.mouse.up();await A.waitForTimeout(500);
  const shot=(await A.screenshot({clip:{x:box.x,y:y-6,width:box.width,height:12}})).toString('base64');
  const dark=await A.evaluate(async b64=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const k=document.createElement('canvas');k.width=im.width;k.height=im.height;const x=k.getContext('2d');x.drawImage(im,0,0);
    const d=x.getImageData(0,0,k.width,k.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]<240)n++;return n},shot);
  ok(dark>50,'drawing on a page from a PDF: the line shows in the editor, over the PDF page ('+dark+' dark pixels)');
  await A.click('#back');await A.waitForTimeout(1000);
  // smaller storage: an annotated PDF page isn't stored twice – the book shows the page with the ink on top
  const lay=await A.evaluate(()=>{const i=2*cs+1,el=$('#pr');return {pv:!!cur.pv[i],bg:!!cur.bg[i],ink:!!cur.pages[i],imgs:el.querySelectorAll('img').length,top:!!el.querySelector('img.ink2'),same:el.querySelector('img.ink2')?.src===cur.pages[i]}});
  ok(!lay.pv&&lay.bg&&lay.ink&&lay.imgs===2&&lay.top&&lay.same,'an annotated PDF page: no second stored picture; the book shows the PDF page with the writing on top');
  const pv=await A.evaluate(async()=>{const bk=cur,i=2*cs;bk.pv[i]='data:image/webp;base64,AAAA';bk.objs[i+2]=[{k:'note',c:'#ffe14d',t:'hi',x:1,y:1,w:90,h:90,f:40,r:0}];bk.pv[i+2]='data:image/webp;base64,BBBB';dropExtraPv();return {drop:!bk.pv[i],keep:!!bk.pv[i+2]}});
  ok(pv.drop&&pv.keep,'older notebooks: page pictures that add nothing are dropped at start; pages with notes or stickers keep theirs');
  await A.evaluate(()=>{const i=2*cs+2;delete cur.pv[i];cur.objs[i]=[]});
  // PDF pages: black-and-white → a grey PNG (smaller, sharper); colour → WebP
  const enc=await A.evaluate(async()=>{const mk=f=>{const c=document.createElement('canvas');c.width=900;c.height=1200;const x=c.getContext('2d');f(x);return c};
    const text=mk(x=>{x.fillStyle='#fff';x.fillRect(0,0,900,1200);x.fillStyle='#111';x.font='16px serif';for(let y=100;y<1150;y+=22)x.fillText('A page of a book, with plain black text on white paper, line after line.',80,y)});
    const colour=mk(x=>{x.fillStyle='#fde7c8';x.fillRect(0,0,900,1200);['#e84a5f','#2a9d8f','#264653'].forEach((c,i)=>{x.fillStyle=c;x.fillRect(100+i*250,300,200,400)})});
    const photo=mk(x=>{const g=x.createLinearGradient(0,0,900,1200);g.addColorStop(0,'#222');g.addColorStop(1,'#ddd');x.fillStyle=g;x.fillRect(0,0,900,1200)});
    const t=await pageURL(text),w=await canvasURL(text,.8),c=await pageURL(colour),ph=await pageURL(photo);
    return {t:t.slice(5,14),tk:Math.round(t.length*.75/1024),wk:Math.round(w.length*.75/1024),c:c.slice(5,15),ph:ph.slice(5,15)}});
  ok(enc.t==='image/png'&&enc.tk<enc.wk*.6&&enc.c==='image/webp'&&enc.ph==='image/webp','PDF pages: black-and-white text → grey PNG ('+enc.tk+' KB instead of '+enc.wk+' KB as WebP); colour and grey photos stay WebP');
  await A.evaluate(()=>closeBook());await A.waitForTimeout(400);

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

  // a phone held sideways: the book is as big as fits, in the middle, and doesn't go under the bars
  const C=await dev('C',{viewport:{width:915,height:412},hasTouch:true,isMobile:true});await signIn(C,'phone11@example.com',true);
  await C.evaluate(()=>{const bk=mk('Phone book',data.length,'p');bk.pages=[null,null,null,null];bk.cs=0;data.push(bk);persist();showBrowse(bk)});
  await C.waitForFunction(()=>cs===0&&!flipping,null,{timeout:15000});await C.waitForTimeout(600);
  const f2=await fitOf(C);
  ok(f2.under&&f2.gt>=0&&f2.gb>=0&&Math.abs(f2.gt-f2.gb)<=4&&f2.fill>=90,'a phone: the open book fills the room between the bars and sits in the middle (gap '+f2.gt+' / '+f2.gb+' px, '+f2.fill+'%)');
  [...A.errs,...B.errs,...C.errs].forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
