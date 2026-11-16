// Update 7: notebooks must never disappear.
// Checks: missing notebooks come back when the app starts, two windows of the app don't erase each other's notebooks,
// nothing is written while a library is loading, deleted notebooks go to "Recently deleted" for 30 days,
// and cloud sync brings notebooks back instead of deleting them (Pro).
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node update7-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','app'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
(async()=>{
  require('http').createServer((q,res)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!f.startsWith('/app/')){res.writeHead(404);return res.end()}
    f=path.join(ROOT,f.slice(4));if(f.endsWith(path.sep)||f===ROOT)f=path.join(f,'index.html');
    if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))}else{res.writeHead(404);res.end('nf')}}).listen(5190,'127.0.0.1');
  const b=await chromium.launch();
  const URL0='http://127.0.0.1:5190/app/?emu=127.0.0.1';
  const ctxOf=async()=>{const ctx=await b.newContext({viewport:{width:1100,height:820}});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());return ctx};
  const open=async(ctx,name)=>{const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(name+': '+e.message));await p.goto(URL0);return p};
  const ready=p=>p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});
  const signUp=async(p,em)=>{await p.waitForSelector('#a-em',{timeout:15000});await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');await ready(p);await answerSurvey(p);await p.waitForTimeout(400)};
  const signIn=async(p,em)=>{await p.waitForSelector('#a-em',{timeout:15000});await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');await ready(p);await answerSurvey(p);await p.waitForTimeout(400)};
  const titles=p=>p.evaluate(()=>data.map(b=>b.title).sort().join(', '));
  const newBook=async(p,title,pages=1)=>{await p.evaluate(async([t,n])=>{const b=mk(t,data.length,'p');b.pages=Array(n).fill(null);data.push(b);persist();await saveNow();renderShelf()},[title,pages])};
  const idbKeys=p=>p.evaluate(()=>new Promise(res=>{const r=indexedDB.open('sketchbook');r.onsuccess=()=>{const t=r.result.transaction('kv').objectStore('kv').getAllKeys();t.onsuccess=()=>res(t.result.map(String))}}));
  const setIdx=(p,ids)=>p.evaluate(ids=>new Promise(res=>{const r=indexedDB.open('sketchbook');r.onsuccess=()=>{const t=r.result.transaction('kv','readwrite');t.objectStore('kv').put(ids,P2+'idx');t.oncomplete=()=>res()}}),ids);
  const reload=async p=>{await p.reload();await ready(p);await p.waitForTimeout(1200)};

  // ---- 1) a notebook that fell out of the shelf list comes back (it used to be erased on the next save)
  const C1=await ctxOf(),A=await open(C1,'A');await signUp(A,'ana@example.com');
  await newBook(A,'Trip',3);await newBook(A,'Recipes',2);
  ok(await titles(A)==='Recipes, Trip, Welcome to Foliet','Ana has Trip, Recipes and the welcome notebook');
  ok(await A.evaluate(()=>!!document.querySelector('#pdfb .soon:not(.hidden)')),'free plan: the button says "Import PDF  Pro"');
  const wid=await A.evaluate(()=>String(data.find(b=>b.welcome).id));
  await setIdx(A,[wid]); // the shelf list on the device loses Trip and Recipes (what used to happen)
  await reload(A);
  ok(await titles(A)==='Recipes, Trip, Welcome to Foliet','after the app starts again, Trip and Recipes are back on the shelf ('+await titles(A)+')');
  ok(await A.evaluate(()=>data.find(b=>b.title==='Trip').pages.length===3),'… with all their pages');
  await A.evaluate(()=>{persist()});await A.evaluate(()=>saveNow());await reload(A);
  ok(await titles(A)==='Recipes, Trip, Welcome to Foliet','and they stay after another save and restart');

  // ---- 2) nothing is written while a library is loading or closed
  const before=(await idbKeys(A)).length;
  await A.evaluate(async()=>{const d=data;LIBST.ready=false;data=[];persist();await saveNow();data=d;LIBST.ready=true});
  await reload(A);
  ok(await titles(A)==='Recipes, Trip, Welcome to Foliet'&&(await idbKeys(A)).length>=before,'a save while the library is loading or closed writes nothing');

  // ---- 3) two windows of the app at the same time
  const A2=await open(C1,'A2');await ready(A2);await A2.waitForTimeout(800);
  await newBook(A,'From window one');
  await newBook(A2,'From window two'); // this window never saw "From window one"
  await reload(A);
  ok(/From window one/.test(await titles(A))&&/From window two/.test(await titles(A)),'two windows: notebooks made in both are kept ('+await titles(A)+')');
  await A2.close();

  // ---- 4) deleting goes to "Recently deleted" (30 days); restore; purge after 30 days
  await A.evaluate(()=>renderShelf());
  const del=async(p,t)=>{const c=p.locator('.cell:not(.add)',{hasText:t}).locator('xpath=..').locator('.del');await c.click();await c.click();await p.waitForTimeout(600)};
  await del(A,'Recipes');
  ok(!/Recipes/.test(await titles(A))&&await A.evaluate(()=>TRASH.length===1&&TRASH[0].title==='Recipes'),'deleting Recipes moves it to Recently deleted');
  ok(await A.evaluate(()=>Math.round((trashEnd(TRASH[0])-TRASH[0].at)/864e5)===2),'free plan: it is kept 2 days');
  ok(await A.evaluate(()=>!!document.querySelector('#trashb:not(.hidden)')&&/Recently deleted \(1\)/.test($('#trashb').textContent)),'the shelf shows "Recently deleted (1)"');
  await reload(A);
  ok(!/Recipes/.test(await titles(A))&&await A.evaluate(()=>TRASH.length===1),'it stays deleted after a restart (not brought back by mistake)');
  await A.click('#trashb');await A.waitForSelector('#lockc .trow');
  ok(await A.evaluate(()=>/Recipes/.test($('#lockc').textContent)&&/kept here for 2 days\. With Pro, 30 days/.test($('#lockc').textContent)&&/2 days left/.test($('#lockc').textContent)),'Recently deleted lists Recipes: "2 days left" (free plan; with Pro, 30 days)');
  await A.click('#lockc .trow >> text=Restore');await A.waitForTimeout(800);
  ok(/Recipes/.test(await titles(A))&&await A.evaluate(()=>data.find(b=>b.title==='Recipes').pages.length===2&&TRASH.length===0),'Restore brings Recipes back with its 2 pages');
  const recId=await A.evaluate(()=>String(data.find(b=>b.title==='Recipes').id));
  await del(A,'Recipes');
  ok((await idbKeys(A)).some(k=>k.includes(':b:'+recId)),'while in Recently deleted, its records stay on the device');
  await A.evaluate(async()=>{TRASH[0].x=Date.now()-1000;persist();await saveNow()}); // its time is up
  await reload(A);await A.evaluate(()=>saveNow());await A.waitForTimeout(500);
  const left=(await idbKeys(A)).filter(k=>/:b:|:p:/.test(k)),rid=await A.evaluate(()=>TRASH.length);
  ok(rid===0&&!left.some(k=>k.includes(recId))&&await A.evaluate(()=>!document.querySelector('#trashb:not(.hidden)')),'when its time is up it is removed for good (records erased)');

  // ---- 5) Pro sync: a notebook missing on this device is brought back from the cloud, not deleted from it
  const uid=await A.evaluate(()=>ACC.user.uid);
  await admin('pro/'+uid,{fields:{by:{stringValue:'admin'},since:{timestampValue:new Date().toISOString()},days:{integerValue:'0'}}});
  await A.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  const syncDone=async p=>{await p.waitForTimeout(800);await p.evaluate(()=>syncRun());await p.waitForFunction(()=>!ACC.busy,null,{timeout:30000});await p.waitForTimeout(800);await p.evaluate(()=>syncRun());await p.waitForFunction(()=>!ACC.busy,null,{timeout:30000})};
  await syncDone(A);
  const cloudBooks=async()=>{const r=await admin('users/'+uid,null,'GET');const j=await r.json();return Object.keys((j.fields&&j.fields.m&&j.fields.m.mapValue.fields)||{}).filter(k=>/^b~/.test(k)).length};
  const nb=await A.evaluate(()=>data.length);
  ok(await cloudBooks()===nb,'all '+nb+' notebooks are in the cloud');
  // the device loses the shelf list AND the Trip records entirely (as if the browser had cleared them)
  const tid=await A.evaluate(()=>String(data.find(b=>b.title==='Trip').id));
  await A.evaluate(([wid,tid])=>new Promise(res=>{const r=indexedDB.open('sketchbook');r.onsuccess=()=>{const t=r.result.transaction('kv','readwrite'),s=t.objectStore('kv');
    s.put([wid],P2+'idx');const g=s.getAllKeys();g.onsuccess=()=>{g.result.forEach(k=>{if(String(k).startsWith(P2+'b:'+tid)||String(k).startsWith(P2+'p:'+tid+':'))s.delete(k)})};t.oncomplete=()=>res()}}),[wid,tid]);
  await reload(A);await syncDone(A);
  ok(/Trip/.test(await titles(A))&&await A.evaluate(()=>data.find(b=>b.title==='Trip').pages.length===3),'Pro: Trip, lost on the device, comes back from the cloud ('+await titles(A)+')');
  ok(await cloudBooks()===nb,'… and the cloud still has every notebook ('+await cloudBooks()+'/'+nb+')');
  // a second device: deleting on A sends it to B's Recently deleted, not straight to nowhere
  const C2=await ctxOf(),B=await open(C2,'B');await signIn(B,'ana@example.com');await B.waitForFunction(()=>ACC.pro,null,{timeout:15000});await syncDone(B);
  ok(/Trip/.test(await titles(B)),'device B gets all the notebooks ('+await titles(B)+')');
  await A.evaluate(()=>renderShelf());await del(A,'From window two');await syncDone(A);await syncDone(B);
  ok(!/From window two/.test(await titles(B))&&await B.evaluate(()=>TRASH.some(t=>t.title==='From window two')),'deleted on A → on B it moves to Recently deleted (can still be restored there)');
  ok(await A.evaluate(()=>{const t=TRASH.find(t=>t.title==='From window two');return t&&Math.round((trashEnd(t)-t.at)/864e5)===30}),'Pro: a deleted notebook is kept 30 days');

  // ---- 6) PDF import (Pro): no "Pro" badge on the button; a page that can't be read doesn't stop the rest
  ok(await A.evaluate(()=>!document.querySelector('#pdfb .soon:not(.hidden)')&&$('#pdfb').innerText.trim()==='Import PDF'),'Pro: the button just says "Import PDF"');
  const mk2=await b.newPage();
  await mk2.setContent('<style>@page{size:600px 800px;margin:0}body{margin:0}div{width:600px;height:800px;page-break-after:always;font:40px serif}</style><div style="background:#d33">1</div><div style="background:#3a3">2</div><div style="background:#33d">3</div><div style="background:#dd3">4</div><div style="background:#3dd">5</div>');
  const pdfPath=path.join(require('os').tmpdir(),'u7-test.pdf');fs.writeFileSync(pdfPath,await mk2.pdf({width:'600px',height:'800px',printBackground:true}));await mk2.close();
  await A.evaluate(()=>{const orig=renderPdfPage;window.renderPdfPage=async(doc,i,w,h)=>{if(i===3)throw new Error('a page this device can\'t read');return orig(doc,i,w,h)}});
  await A.setInputFiles('#pdff',pdfPath);await A.waitForSelector('#pdfd',{timeout:15000});await A.click('#pi-go');
  await A.waitForFunction(()=>/Imported/.test($('#sv').textContent),null,{timeout:30000});
  const imp=await A.evaluate(()=>{const b=data.find(x=>x.title==='u7-test');return {t:$('#sv').textContent,n:b.pages.length,bg:Array.from({length:b.pages.length},(_,i)=>!!b.bg[i]),cbg:!!b.cbg,imp:!!b._imp,shelf:/u7-test/.test($('#grid').textContent)||!$('#bv').classList.contains('hidden')}});
  ok(imp.n===4&&imp.cbg&&imp.bg.join()==='true,false,true,true'&&!imp.imp,'PDF with an unreadable page: cover + 4 pages, only that page left blank ('+JSON.stringify(imp.bg)+')');
  ok(/Imported 3 pages and the cover\. 1 page couldn’t be read and was left blank\./.test(imp.t),'… and it says so ("'+imp.t+'")');
  ok(await A.evaluate(()=>{const b=data.find(x=>x.title==='u7-test');return b.cc===2&&b.color===PAPER&&boardCol(b,.2)==='#e7e5dd'}),'a PDF cover gets the paper color: its sides look like the pages, not a random notebook color');
  // choose pages: only pages 2 and 4 of the same PDF, into a notebook that already exists (Trip)
  await A.evaluate(()=>{delete window.renderPdfPage;showBrowse(data.find(b=>b.title==='Trip'))});await A.waitForTimeout(600);
  const tn0=await A.evaluate(()=>cur.pages.length);
  await A.click('#badd');await A.waitForSelector('#npd:not(.hidden)');
  ok(await A.evaluate(()=>!$('#nppdf .soon:not(.hidden)')&&/Add pages from a PDF/.test($('#nppdf').textContent)),'New pages has "Add pages from a PDF" (Pro, no badge)');
  const [fc]=await Promise.all([A.waitForEvent('filechooser'),A.click('#nppdf')]);await fc.setFiles(pdfPath);
  await A.waitForSelector('#pdfd');
  ok(await A.evaluate(()=>$('#pi-to').value===String(cur.id)&&$('.pd-o').classList.contains('hidden')),'the import window already points at this notebook');
  await A.click('#pi-pick');await A.waitForSelector('#pi-grid .pd-pg');
  ok(await A.evaluate(()=>document.querySelectorAll('#pi-grid .pd-pg').length===5&&$('#pi-go').disabled),'"Choose pages" shows all 5 pages to tick');
  await A.waitForFunction(()=>document.querySelector('#pi-grid .pd-pg i').style.backgroundImage,null,{timeout:10000});
  await A.click('#pi-grid .pd-pg[data-i="2"]');await A.click('#pi-grid .pd-pg[data-i="4"]');
  ok(await A.evaluate(()=>/2 of 5 selected/.test($('.pd-cnt').textContent)&&$('#pi-go').textContent==='Import 2 pages'),'2 of 5 selected → "Import 2 pages"');
  await A.click('#pi-go');await A.waitForFunction(()=>/into Trip/.test($('#sv').textContent),null,{timeout:30000});
  const tr=await A.evaluate(n0=>{const b=data.find(x=>x.title==='Trip');const px=u=>new Promise(r=>{const m=new Image();m.onload=()=>{const c=document.createElement('canvas');c.width=c.height=1;c.getContext('2d').drawImage(m,m.width/2,m.height/2,1,1,0,0,1,1);r([...c.getContext('2d').getImageData(0,0,1,1).data].slice(0,3))};m.src=u});
    return Promise.all([px(b.bg[n0]),px(b.bg[n0+1])]).then(c=>({n:b.pages.length,c,toast:$('#sv').textContent}))},tn0);
  ok(tr.n===tn0+2&&tr.c[0][1]>130&&tr.c[0][0]<110&&tr.c[1][0]>180&&tr.c[1][1]>180&&tr.c[1][2]<110,'only pages 2 (green) and 4 (yellow) were added at the end of Trip ('+JSON.stringify(tr)+')');
  await A.click('#bclose');await A.waitForTimeout(300);
  await A.evaluate(async()=>{const b=data.find(x=>x.title==='u7-test');b.color=BC[2];delete b.cc;persist();await saveNow()}); // as an import from before this update
  await reload(A);
  ok(await A.evaluate(()=>{const b=data.find(x=>x.title==='u7-test');return b.cc===2&&b.color===PAPER}),'a PDF notebook imported before gets its cover color fixed when the app starts');

  for(const p of [A,B])p.errs.forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
