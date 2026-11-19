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
  // feedback: a gentle reminder now and then, and a reply-to address of your choice
  await A.waitForFunction(()=>localStorage.getItem('sb-fbn:'+ACC.user.uid),null,{timeout:8000});
  ok(await A.evaluate(()=>{const v=JSON.parse(localStorage.getItem('sb-fbn:'+ACC.user.uid)||'null');return v&&v.n===0&&Math.round((v.next-Date.now())/864e5)===5&&!$('#fbnudge')}),'feedback reminder: not on the first days (first one after 5 days)');
  await A.evaluate(()=>{const k='sb-fbn:'+ACC.user.uid,v=JSON.parse(localStorage.getItem(k));v.next=Date.now()-1000;localStorage.setItem(k,JSON.stringify(v))});
  await A.reload();await ready(A);await A.waitForSelector('#fbnudge',{timeout:8000});
  ok(await A.evaluate(()=>{const o=$('#fbnudge').getBoundingClientRect(),q=$('#fbnudge .fbn-sq').getBoundingClientRect();
    return /How is Foliet working for you/.test($('#fbnudge').textContent)&&/Every suggestion helps us a lot/.test($('#fbnudge').textContent)
      &&o.width===innerWidth&&o.height===innerHeight&&q.width>=400&&Math.abs(q.width-q.height)<40}),'after that, a big square in the middle of the screen asks for feedback ("Every suggestion helps us a lot")');
  await A.click('#fbnudge >> text=Maybe later');
  ok(await A.evaluate(()=>{const v=JSON.parse(localStorage.getItem('sb-fbn:'+ACC.user.uid));return !$('#fbnudge')&&v.n===1&&Math.round((v.next-Date.now())/864e5)===21}),'"Maybe later" hides it; the next one comes in 3 weeks at the earliest');
  // after the first 6 it does not stop: around 8 months and 1 year after you started, then every 6 months
  const setN=(n,ago)=>A.evaluate(([n,ago])=>{const now=Date.now();localStorage.setItem('sb-fbn:'+ACC.user.uid,JSON.stringify({f:now-ago*864e5,n,next:now-1000}))},[n,ago]);
  const fbv=()=>A.evaluate(()=>JSON.parse(localStorage.getItem('sb-fbn:'+ACC.user.uid)));
  await setN(5,110);await A.reload();await ready(A);await A.waitForSelector('#fbnudge',{timeout:8000});
  let v6=await fbv();ok(v6.n===6&&Math.round((v6.next-v6.f)/864e5)===243,'the 6th reminder: the next one comes about 8 months after you started');
  await A.keyboard.press('Escape');ok(await A.evaluate(()=>!$('#fbnudge')),'Escape closes it');
  await setN(6,250);await A.reload();await ready(A);await A.waitForSelector('#fbnudge',{timeout:8000});
  v6=await fbv();ok(v6.n===7&&Math.round((v6.next-v6.f)/864e5)===365,'… then about 1 year after you started');
  await A.mouse.click(5,5);ok(await A.evaluate(()=>!$('#fbnudge')),'a click next to the square closes it');
  ok(await A.evaluate(()=>[fbNudgeNext({n:8,f:1},400*864e5),fbNudgeNext({n:9,f:1},560*864e5)].map(t=>Math.round(t/864e5)).join()==='547,729'),'… and then every 6 months, for as long as you use Foliet');
  await setN(1,30);await A.evaluate(()=>{showBrowse(data.find(b=>b.title==='Trip'))});await A.waitForTimeout(600);await A.evaluate(()=>fbNudge());
  ok(await A.evaluate(()=>!$('#fbnudge')&&JSON.parse(localStorage.getItem('sb-fbn:'+ACC.user.uid)).n===1),'never over an open notebook (it waits for the shelf)');
  await A.evaluate(()=>closeBook());await A.waitForTimeout(300);
  await A.evaluate(()=>{const now=Date.now();localStorage.setItem('sb-fbn:'+ACC.user.uid,JSON.stringify({f:now,n:1,next:now+21*864e5}))});
  await A.click('#menub');await A.click('#mfb');await A.waitForSelector('#fbk');
  ok(await A.evaluate(()=>$('#fb-rto').value==='ana@example.com'&&/No spam, ever/.test($('#fbk').textContent)),'the feedback form asks where to reply (your account email to start with) and says no spam');
  await A.fill('#fbk textarea','Could you add more colors?');await A.fill('#fb-rto','not-an-email');await A.click('#fbk .btn');await A.waitForTimeout(400);
  ok(await A.evaluate(()=>/check the email address/.test($('#fbk .lk-err').textContent)),'a wrong reply address is caught');
  await A.fill('#fb-rto','ana.home@example.org');await A.click('#fbk .btn');await A.waitForSelector('#fbk',{state:'detached',timeout:10000});
  const fbs=await (await admin('feedback',null,'GET')).json();
  const mine=(fbs.documents||[]).find(d=>/more colors/.test(d.fields.text.stringValue));
  ok(mine&&mine.fields.rto.stringValue==='ana.home@example.org'&&mine.fields.email.stringValue==='ana@example.com','saved with the reply address she chose (the rules accept it)');
  ok(await A.evaluate(()=>Math.round((JSON.parse(localStorage.getItem('sb-fbn:'+ACC.user.uid)).next-Date.now())/864e5)===60),'after sending feedback, no reminder for 2 months');
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
  const del=async(p,t)=>{const c=p.locator('.cell:not(.add)',{hasText:t}).locator('xpath=..').locator('.more');await c.click();await p.click('#pop >> text=Delete');await p.click('#lockd .btn.danger');await p.waitForTimeout(600)};
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

  // ---- 7) admin panel: categories, overview, money & profit (income, fees, costs), discount codes
  await admin('admins/'+uid,{fields:{note:{stringValue:'test'}}});await A.evaluate(()=>checkAdmin(ACC.user));await A.waitForTimeout(500);
  const nowS=Math.floor(Date.now()/1000);
  await admin('customers/'+uid+'/payments/pi_sub',{fields:{status:{stringValue:'succeeded'},amount:{integerValue:'399'},amount_received:{integerValue:'399'},currency:{stringValue:'eur'},created:{integerValue:String(nowS)},invoice:{stringValue:'in_1'}}});
  await admin('customers/'+uid+'/payments/pi_store',{fields:{status:{stringValue:'succeeded'},amount:{integerValue:'99'},amount_received:{integerValue:'99'},currency:{stringValue:'eur'},created:{integerValue:String(nowS)}}});
  await A.evaluate(()=>{showBrowse(data[0]);$('#bclose').click()});await A.waitForTimeout(300);
  await A.click('#menub');await A.click('#madm');await A.waitForSelector('.acats',{timeout:15000});
  ok(await A.evaluate(()=>[...document.querySelectorAll('.acats button')].map(b=>b.textContent).join('|')==='Overview|Money & profit|Accounts|Who uses it|Found us|Feedback|Codes & discounts|Pro members|Store|Find an account'),'admin: a bar of categories');
  ok(await A.evaluate(()=>[...document.querySelectorAll('#adm-body .asec')].filter(s=>!s.hidden).map(s=>s.dataset.s).join()==='ov'),'… only one category is shown at a time (Overview first)');
  await A.click('.acats >> text=Money & profit');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>[...document.querySelectorAll('#adm-body .asec')].filter(s=>!s.hidden).map(s=>s.dataset.s).join()==='money'&&$('.acats button[aria-pressed="true"]').textContent==='Money & profit'),'tapping "Money & profit" shows only that');
  await A.click('#adm-body .aper >> text=This month');await A.waitForTimeout(300);
  const card=l=>A.evaluate(l=>{const c=[...document.querySelectorAll('#adm-body .acard')].find(x=>x.querySelector('span').textContent===l);return c?c.querySelector('b').textContent:null},l);
  ok(await card('Income')==='€4.98'&&await card('From subscriptions')==='€3.99'&&await card('From the store')==='€0.99','Overview income €4.98; Money splits it: €3.99 subscriptions, €0.99 store');
  ok(await card('Stripe fees (est.)')==='€0.57','Stripe fees estimated (1.5% + €0.25 a payment): €0.57');
  await A.fill('#adm-cost input[placeholder="e.g. Firebase"]','Firebase');await A.fill('#adm-cost input[type=number]','2.50');await A.click('#adm-cost button[type=submit]');
  await A.waitForFunction(()=>/Firebase/.test($('.acosts').textContent),null,{timeout:10000});await A.waitForTimeout(300);
  const cdoc=await (await admin('config/costs',null,'GET')).json();
  ok(cdoc.fields&&cdoc.fields.items.arrayValue.values.length===1&&await card('Running costs')==='€2.50','a running cost (Firebase €2.50 a month) is saved and counted');
  ok(await card('Profit (est.)')==='€1.91','profit = income − fees − costs = €1.91');
  ok(await A.evaluate(()=>[...document.querySelectorAll('#adm-cper option')].map(o=>o.textContent).join('|')==='Every month|Every year|Once'),'running costs can be every month, every year or once');
  const ym=await A.evaluate(()=>ymOf(new Date()));
  await A.fill('#adm-cost input[placeholder="e.g. Firebase"]','Domain');await A.fill('#adm-cost input[type=number]','12');await A.selectOption('#adm-cper','year');await A.click('#adm-cost button[type=submit]');
  await A.waitForFunction(()=>/Domain/.test($('.acosts').textContent),null,{timeout:10000});await A.waitForTimeout(300);
  ok(await card('Running costs')==='€14.50'&&await A.evaluate(()=>/Domain €12\.00 a year since/.test($('.acosts').textContent)),'a yearly cost (domain €12) counts in its month: running costs €14.50');
  ok(await A.evaluate(()=>costsIn([{n:'d',c:1200,per:'year',at:'2024-03'}],{a:+new Date(2025,0,1),b:+new Date(2026,0,1)})===1200&&costsIn([{n:'d',c:1200,per:'year',at:'2024-03'}],{a:+new Date(2025,3,1),b:+new Date(2025,11,1)})===0&&costsIn([{n:'f',c:250,per:'month',at:'2025-01'}],{a:+new Date(2025,0,1),b:+new Date(2025,6,1)})===1500),'a yearly cost is paid once a year in its month; a monthly one every month');
  const ch=await A.evaluate(()=>{const s=document.querySelector('.asec[data-s="money"]');const t=[...s.querySelectorAll('.achart .ach-h b')].map(b=>b.textContent);const lg=[...s.querySelector('.achart .ach-lg').querySelectorAll('span')].map(x=>x.textContent);return {t,lg,lines:s.querySelectorAll('.achart polyline').length,pie:!!s.querySelector('.ach-dsvg')}});
  ok(ch.t.includes('Income, costs and profit')&&ch.lg.join()==='Income,Costs,Profit'&&ch.lines===3&&ch.t.some(t=>/^Profit, /.test(t))&&ch.t.includes('Where the money comes from')&&ch.pie,'Money charts: income (green), costs (red) and profit lines, profit bars, and pie charts ('+ch.t.join(' · ')+')');
  const pie=await A.evaluate(()=>{const g=[...document.querySelectorAll('.asec[data-s="money"] .ach-dsvg')].pop(),r=g.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/120;let miss=0;
    for(const rad of [6,20,40,52])for(let a=0;a<360;a+=7.5){const t=document.elementFromPoint(cx+rad*R*Math.sin(a*Math.PI/180),cy-rad*R*Math.cos(a*Math.PI/180));if(!t||!t.classList.contains('ach-sl'))miss++}
    return {miss,n:g.querySelectorAll('path.ach-sl').length,rows:g.parentNode.querySelectorAll('.dl-r').length}});
  ok(pie.miss===0&&pie.n===pie.rows&&pie.n>=2,'the pie has no gaps: every point around its middle is a slice ('+pie.n+' slices, '+pie.miss+' gaps)');
  ok(await A.evaluate(()=>/Your running costs are about €/.test($('.asec[data-s="money"] .ach-ins').textContent)&&/Pro monthly subscriber/.test($('.asec[data-s="money"] .ach-ins').textContent)),'… and a note: what the running costs are and how many subscribers pay for them');
  await A.click('.acats >> text=Overview');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>{const s=document.querySelector('.asec[data-s="ov"]');return !s.hidden&&[...s.querySelectorAll('.ach-h b')].map(b=>b.textContent).includes('Income and costs')&&s.querySelector('.ach-lg').textContent==='IncomeCosts'}),'Overview: a chart of income (green) against costs (red)');
  const tip=await A.evaluate(()=>{const pl=document.querySelector('.asec[data-s="ov"] .ach-plot');const r=pl.getBoundingClientRect();pl.dispatchEvent(new PointerEvent('pointermove',{clientX:r.right-2,clientY:r.top+20,bubbles:true}));const t=pl.querySelector('.ach-tip');return !t.hidden&&t.textContent});
  ok(/Income: €/.test(tip)&&/Costs: €/.test(tip),'pointing at the chart shows the numbers ('+tip+')');
  await A.click('.acats >> text=Codes & discounts');await A.waitForTimeout(200);
  await A.fill('#adm-cf input[placeholder="CODE"]','HALF-1');await A.selectOption('#adm-kind','off');await A.fill('#adm-pct','50');await A.selectOption('#adm-for','pro-m');await A.selectOption('#adm-dur','once');await A.fill('#adm-max','100');
  await A.click('#adm-cf >> text=Create code');await A.waitForSelector('#adm-codes >> text=HALF-1',{timeout:10000});
  const hd=await (await admin('codes/HALF-1',null,'GET')).json();
  ok(hd.fields.kind.stringValue==='off'&&hd.fields.pct.integerValue==='50'&&hd.fields.for.stringValue==='pro-m'&&hd.fields.dur.stringValue==='once'&&await A.evaluate(()=>/Discount: 50% off Pro monthly – the first payment/.test($('#adm-codes').textContent)),'a discount code: 50% off Pro monthly, first payment');
  const dm=await B.evaluate(()=>redeemCode('half-1').then(r=>r.msg));
  ok(/50% off Pro monthly – the first payment\. You can use it at checkout/.test(dm),'a person typing it is told what it gives and that it works at checkout ("'+dm+'")');
  await A.click('#adm-x');

  for(const p of [A,B])p.errs.forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
