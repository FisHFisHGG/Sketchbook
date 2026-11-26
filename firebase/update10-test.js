// Update 10: the Store's banner and items added from the admin panel (permanent or for a while), and live links
// (anyone can look without an account – in Foliet's own 3D book –, people you allow edit after signing in; <site>/<notebook-name>/<code>).
// The test serves the site under /Sketchbook/ with 404.html for addresses that aren't files – like GitHub Pages.
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node update10-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SITE=path.join(__dirname,'..'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.json':'application/json'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
(async()=>{
  // like GitHub Pages: the site lives under /Sketchbook/, and 404.html answers addresses that aren't files
  require('http').createServer((q,res)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!u.startsWith('/Sketchbook/')){res.writeHead(404);return res.end()}
    let f=path.join(SITE,u.slice('/Sketchbook/'.length));if(u.endsWith('/'))f=path.join(f,'index.html');
    if(f.startsWith(SITE)&&!/^(firebase|\.git)\b|CLAUDE/.test(path.relative(SITE,f))&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});return res.end(fs.readFileSync(f))}
    res.writeHead(404,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(SITE,'404.html')))}).listen(5193,'127.0.0.1');
  const b=await chromium.launch();
  const BASE='http://127.0.0.1:5193/Sketchbook/',URL0=BASE+'app/?emu=127.0.0.1';
  const ctxOf=async()=>{const ctx=await b.newContext({viewport:{width:1100,height:850}});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());return ctx};
  const open=async(ctx,name,url)=>{const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(name+': '+e.message));await p.goto(url||URL0);return p};
  const vReady=p=>p.waitForFunction(()=>VIEWC&&cur&&cur._view&&$('#boot').classList.contains('hidden'),null,{timeout:30000}); // a live link open in Foliet's book
  const ready=p=>p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});
  const signUp=async(p,em)=>{await p.waitForSelector('#a-em',{timeout:15000});await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');await ready(p);await answerSurvey(p);await p.waitForTimeout(500)};
  const signIn=async(p,em)=>{await p.waitForSelector('#a-em',{timeout:15000});await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');await ready(p);await answerSurvey(p);await p.waitForTimeout(500)};
  const giveAdmin=async p=>{const id=await p.evaluate(()=>ACC.user.uid);await admin('admins/'+id,{fields:{note:{stringValue:'t'}}});await p.evaluate(()=>checkAdmin(ACC.user));await p.waitForTimeout(400)};
  const givePro=async p=>{const id=await p.evaluate(()=>ACC.user.uid);await admin('pro/'+id,{fields:{by:{stringValue:'admin'},since:{timestampValue:new Date().toISOString()},days:{integerValue:'0'}}});await p.waitForFunction(()=>ACC.pro,null,{timeout:15000});await p.waitForTimeout(500)};
  const png=(p,color,emoji)=>p.evaluate(([c,e])=>{const k=document.createElement('canvas');k.width=k.height=96;const x=k.getContext('2d');x.fillStyle=c;x.beginPath();x.arc(48,48,40,0,7);x.fill();if(e){x.font='48px serif';x.textAlign='center';x.fillText(e,48,64)}return k.toDataURL('image/png').split(',')[1]},[color,emoji]).then(s=>Buffer.from(s,'base64'));

  // ======== 1) the Store: banners and items you add from the admin panel
  const CA=await ctxOf(),A=await open(CA,'A');await signUp(A,'boss10@example.com');await giveAdmin(A);
  await A.click('#menub');await A.click('#madm');await A.waitForSelector('.acats',{timeout:15000});await A.click('.acats >> text=Store');await A.waitForSelector('#adm-bnr');
  ok(await A.evaluate(()=>!!$('#adm-bnr')&&!!$('#adm-item')&&/Nothing added yet/.test($('#adm-shop').textContent)),'admin → Store: “Add a banner” and “Add an item to the Store”');
  await A.fill('#bnr-t','Spooky week');await A.fill('#bnr-d','New stickers, this week only');await A.fill('#bnr-e','🎃');await A.selectOption('#bnr-bg','berry');
  await A.selectOption('#bnr-act','kind');await A.selectOption('#bnr-kind','stk');await A.fill('#bnr-btn','See stickers');await A.selectOption('#bnr-for','7');
  await A.click('#adm-bnr >> text=Preview');ok(await A.evaluate(()=>/Spooky week/.test($('.abnr-pv').textContent)),'a banner can be previewed before it goes up');
  await A.click('#adm-bnr button[type=submit]');await A.waitForFunction(()=>/Spooky week/.test(($('#adm-shop')||{}).textContent||''),null,{timeout:10000});
  // a sticker pack for a week, free
  await A.selectOption('#itm-kind','stk');await A.fill('#itm-n','Spooky');await A.fill('#itm-d','Pumpkins and ghosts.');await A.selectOption('#itm-p','0');
  await A.setInputFiles('#itm-files',[{name:'a.png',mimeType:'image/png',buffer:await png(A,'#ee8a2f','🎃')},{name:'b.png',mimeType:'image/png',buffer:await png(A,'#8a66d6','👻')},{name:'c.png',mimeType:'image/png',buffer:await png(A,'#2e9aa2','🦇')}]);
  await A.waitForFunction(()=>document.querySelectorAll('.aitm-pv img').length===3,null,{timeout:10000});await A.selectOption('#itm-for','7');
  await A.click('#adm-item button[type=submit]');await A.waitForFunction(()=>/Stickers · Spooky/.test(($('#adm-shop')||{}).textContent||''),null,{timeout:10000});
  // a cover, €1.99, permanent
  await A.selectOption('#itm-kind','cov');await A.fill('#itm-n','Night sky');await A.selectOption('#itm-p','199');
  await A.setInputFiles('#itm-files',[{name:'n.png',mimeType:'image/png',buffer:await png(A,'#141c45','🌙')}]);await A.waitForFunction(()=>document.querySelectorAll('.aitm-pv img').length===1,null,{timeout:10000});
  await A.selectOption('#itm-for','0');await A.click('#adm-item button[type=submit]');await A.waitForFunction(()=>/Cover · Night sky/.test(($('#adm-shop')||{}).textContent||''),null,{timeout:10000});
  const shop=(await (await admin('shop',null,'GET')).json()).documents||[];const byN=n=>shop.find(d=>d.fields.n&&d.fields.n.stringValue===n);
  const spk=byN('Spooky'),nsky=byN('Night sky'),bnr=byN('Spooky week'),sid=spk.name.split('/').pop(),cid=nsky.name.split('/').pop();
  const days=t=>Math.round((Date.parse(t)-Date.now())/864e5);
  ok(spk.fields.items.arrayValue.values.length===3&&spk.fields.p.integerValue==='0'&&days(spk.fields.until.timestampValue)===7,'the sticker pack is saved: 3 pictures, free, for 1 week');
  ok(!nsky.fields.until&&nsky.fields.p.integerValue==='199'&&/^data:image\/jpeg/.test(nsky.fields.img.stringValue),'the cover is saved: €1.99, permanent');
  ok(bnr.fields.act.stringValue==='kind'&&bnr.fields.av.stringValue==='stk'&&days(bnr.fields.until.timestampValue)===7,'the banner is saved: for 1 week, its button opens Stickers');
  ok(await A.evaluate(()=>/Live · ends .*7 days left/.test($('#adm-shop').textContent)&&/Live · permanent/.test($('#adm-shop').textContent)),'the list says what’s live and until when');

  // someone opens the Store
  const CU=await ctxOf(),U=await open(CU,'U');await signUp(U,'una10@example.com');
  await U.click('#storeb');await U.waitForSelector('.sbanner',{timeout:15000});
  ok(await U.evaluate(()=>/Spooky week/.test($('.sbanner').textContent)&&/New stickers, this week only/.test($('.sbanner').textContent)&&/Ends in 7 days/.test($('.sbanner').textContent)),'the Store shows the big banner at the top (with “Ends in 7 days”)');
  await U.click('.sbanner .sb-go');await U.waitForTimeout(300);
  ok(await U.evaluate(()=>SKIND==='stk'&&!!document.querySelector('#tpl .tcardx[data-t="'+STPK.find(p=>p.n==='Spooky').id+'"]')),'its button opens the Stickers section, with the new pack');
  ok(await U.evaluate(id=>{const c=document.querySelector('#tpl .tcardx[data-t="'+id+'"]');return /Limited · 7 days left/.test(c.textContent)&&/Get it free/.test(c.textContent)},sid),'the pack says “Limited · 7 days left” and “Get it free”');
  await U.click('#tpl .tcardx[data-t="'+sid+'"]');await U.waitForSelector('#t-get');await U.click('#t-get');await U.waitForTimeout(1200);
  ok(await U.evaluate(id=>ACC.owned.has(id)&&STPK.filter(ownsItem).some(p=>p.id===id),sid),'“Get it free”: the pack is hers, and it’s in + → Stickers');
  const own=await (await admin('owned/'+await U.evaluate(()=>ACC.user.uid),null,'GET')).json();
  ok(own.fields.t.arrayValue.values.some(v=>v.stringValue===sid)&&own.fields.last.stringValue==='free','… saved in her account (owned)');
  await U.click('.skinds [data-k="cov"]');await U.waitForTimeout(300);
  ok(await U.evaluate(id=>{const c=document.querySelector('#tpl .tcardx[data-t="'+id+'"]');return c&&/€1\.99/.test(c.textContent)&&/Unlock for €1\.99/.test(c.textContent)},cid),'the cover is in Covers for €1.99');
  // the admin gives the cover with a store code
  await A.click('#adm-r');await A.waitForSelector('.acats');await A.click('.acats >> text=Codes & discounts');
  await A.fill('#adm-cf input[placeholder="CODE"]','NIGHT-1');await A.selectOption('#adm-kind','tpl');await A.selectOption('#adm-ctpl',cid);await A.click('#adm-cf >> text=Create code');await A.waitForSelector('#adm-codes >> text=NIGHT-1',{timeout:10000});
  const rc=await U.evaluate(()=>redeemCode('NIGHT-1'));
  await U.waitForFunction(id=>ACC.owned.has(id),cid,{timeout:10000}).catch(()=>{}); // the account's list of things it owns comes back from the cloud a moment later
  ok(rc.ok&&rc.tpl===cid&&await U.evaluate(id=>ACC.owned.has(id),cid),'a store code can give the new cover too');
  await U.evaluate(id=>{const b=data[0];useCover(COVERS.find(c=>c.id===id),b)},cid);await U.waitForTimeout(600);
  ok(await U.evaluate(id=>data[0].design==='x-'+id&&/data:image\/svg/.test(covImg(data[0])),cid),'… and it goes on a notebook cover');
  // the admin ends the pack early: it leaves the Store, Una keeps it
  await A.click('#adm-r');await A.waitForSelector('.acats');await A.click('.acats >> text=Store');await A.waitForSelector('#adm-shop');
  await A.click('#adm-shop .arow:has-text("Spooky") >> text=End now');await A.waitForTimeout(800);
  const CW=await ctxOf(),Wn=await open(CW,'W');await signUp(Wn,'walt10@example.com');await Wn.click('#storeb');await Wn.waitForTimeout(1500);await Wn.click('.skinds [data-k="stk"]');await Wn.waitForTimeout(300);
  ok(await Wn.evaluate(id=>!document.querySelector('#tpl .tcardx[data-t="'+id+'"]'),sid),'after “End now” the pack isn’t in the Store any more');
  const late=await Wn.evaluate(id=>claimFree({id,p:0,on:true}),sid);
  ok(/isn’t available/.test(late),'… and nobody can take it now (the rules check the dates too)');
  await U.reload();await ready(U);await U.waitForTimeout(1500);
  ok(await U.evaluate(id=>STPK.filter(ownsItem).some(p=>p.id===id),sid),'Una still has it');

  // ======== 2) live links
  const CO=await ctxOf(),O=await open(CO,'O');await signUp(O,'olga10@example.com');await givePro(O);
  await O.evaluate(async()=>{const mkImg=c=>{const k=document.createElement('canvas');k.width=900;k.height=1200;const x=k.getContext('2d');x.fillStyle=c;x.fillRect(100,100,700,300);return k.toDataURL('image/webp',.9)};
    const b=mk('Trip to Rome',data.length,'p');b.pages=[mkImg('#e2574c'),null];data.push(b);persist();await saveNow();renderShelf()});
  await O.evaluate(()=>showBrowse(data.find(b=>b.title==='Trip to Rome')));await O.waitForTimeout(600);
  await O.click('#bshare');await O.waitForSelector('#shd:not(.hidden)');
  ok(await O.evaluate(()=>!$('#sh-live').classList.contains('hidden')&&$('#sh-pro').classList.contains('hidden')),'Share → “Live link” (Pro: no badge)');
  await O.click('#sh-live');await O.waitForSelector('#sh-livep:not(.hidden)',{timeout:30000});
  const link=await O.evaluate(()=>$('#sh-url').value),code=link.split('/').pop();
  ok(/^http:\/\/127\.0\.0\.1:5193\/Sketchbook\/trip-to-rome\/[a-z0-9]{6}$/.test(link),'a short link: <site>/trip-to-rome/<code> ('+link+'); at launch it becomes foliet.app/trip-to-rome/'+code);
  await O.waitForTimeout(2500);
  const sh=await (await admin('shares/'+code,null,'GET')).json();
  ok(sh.fields&&sh.fields.n.integerValue==='2'&&sh.fields.on.booleanValue===true&&sh.fields.edit.booleanValue===false&&['meta','p~0','p~1'].every(k=>sh.fields.m.mapValue.fields[k]),'the shared copy is in the cloud: the cover and 2 pages, view only');
  // someone without an account opens the link
  const CV=await b.newContext({viewport:{width:900,height:1000}});await CV.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
  const V=await CV.newPage();V.errs=[];V.on('pageerror',e=>V.errs.push('V: '+e.message));await V.goto(link+'?emu=127.0.0.1');
  await V.waitForURL(/app\/\?view=/,{timeout:15000});await vReady(V);await V.waitForFunction(()=>!PEND.size,null,{timeout:20000});
  ok(await V.evaluate(()=>cur.title==='Trip to Rome'&&cur.pages.length===2&&/view only/.test($('#vlive').textContent)&&$('#vedit').classList.contains('hidden')&&document.title==='Trip to Rome – Foliet Sketchbook'&&!ACC.user&&$('#acct').classList.contains('hidden')),'no account: the link opens “Trip to Rome” in Foliet’s own 3D book – cover and 2 pages, live, view only');
  ok(await V.evaluate(()=>['#bshare','#badd','#bexp','#block'].every(q=>getComputedStyle($(q)).display==='none')&&$('#btitle').readOnly&&$('#bclose').textContent==='Foliet'),'… only to look: no Share, New pages, Export or lock, the name can’t be changed');
  await V.evaluate(()=>flip(0));await V.waitForFunction(()=>cs===0&&!flipping,null,{timeout:10000});
  const tp=await V.evaluate(()=>{const q=$('#pr').getBoundingClientRect();return [q.left+q.width/2,q.top+q.height/2]});await V.mouse.click(tp[0],tp[1]);await V.waitForTimeout(500);
  ok(await V.evaluate(()=>zs===2&&$('#ed').classList.contains('hidden')),'pages 1–2 open like in the app; tapping a page zooms in (no drawing)');
  await V.mouse.click(tp[0],tp[1]);await V.waitForTimeout(400);
  const src1=await V.evaluate(()=>$('#pr').innerHTML);
  // the owner draws: the viewer changes by itself
  await O.evaluate(async()=>{const k=document.createElement('canvas');k.width=900;k.height=1200;const x=k.getContext('2d');x.fillStyle='#2e9aa2';x.fillRect(200,600,500,400);cur.pages[1]=k.toDataURL('image/webp',.9);persist()});
  await V.waitForFunction(s=>$('#pr').innerHTML!==s,src1,{timeout:20000});
  ok(true,'Olga draws on page 2: the open link shows it a moment later, without reloading');
  // edit off: someone signed in is sent to the view
  const CG=await ctxOf(),G=await open(CG,'G');await signUp(G,'gabi10@example.com');
  const wr=await G.evaluate(c=>{const F=ACC.F;return F.setDoc(F.doc(ACC.db,'shares',c,'r','p~0'),{h:'x',n:1,i:0,d:'{}'}).then(()=>'ok',e=>e.code)},code);
  ok(wr==='permission-denied','view only: nobody else can change it (the rules)');
  await G.goto(URL0+'&share='+code);await G.waitForURL(/view=/,{timeout:20000}).catch(()=>{});
  ok(/app\/\?view=/.test(G.url()),'opening it in the app while it’s view only shows the view');
  // the owner allows editing
  await O.check('#sh-edit');await O.waitForTimeout(800);
  ok((await (await admin('shares/'+code,null,'GET')).json()).fields.edit.booleanValue===true&&await O.evaluate(()=>/People with Pro can sign in and draw and write/.test($('#sh-note').textContent)),'Olga ticks “People with Foliet Pro can edit it too”');
  await V.waitForFunction(()=>!$('#vedit').classList.contains('hidden'),null,{timeout:10000});
  ok(await V.evaluate(()=>/app\/\?share=/.test($('#vedit').href)&&/Pro/.test($('#vedit .soon').textContent)&&/Pro members can edit/.test($('#vlive').textContent)),'the link now has an “Edit” button with a Pro badge (it opens Foliet, which asks to sign in)');
  // Gabi has the free plan: she can only look
  await G.goto(URL0);await ready(G);
  const wr2=await G.evaluate(c=>{const F=ACC.F;return F.setDoc(F.doc(ACC.db,'shares',c,'r','p~0'),{h:'x',n:1,i:0,d:'{}'}).then(()=>'ok',e=>e.code)},code);
  ok(wr2==='permission-denied','editing allowed, but a free account still can’t change it (the rules)');
  await G.goto(URL0+'&share='+code);await ready(G);await G.waitForSelector('#shp-look',{timeout:20000});
  if(process.env.SHOT){await G.screenshot({path:process.env.SHOT+'/shpro.png'});await V.screenshot({path:process.env.SHOT+'/viewer.png'})}
  ok(await G.evaluate(()=>/Editing is part of Pro/.test($('#lockc').textContent)&&/Trip to Rome/.test($('#lockc').textContent)&&!cur),'free plan: “Editing is part of Pro – you can look at it any time”');
  await G.click('#shp-pro');await G.waitForTimeout(300);
  ok(await G.evaluate(()=>!$('#up').classList.contains('hidden')&&/part of Pro/.test($('#upm').textContent)),'“See Pro” opens the Pro window');
  await G.goto(URL0+'&share='+code);await ready(G);await G.waitForSelector('#shp-look',{timeout:20000});await G.click('#shp-look');
  await G.waitForURL(/view=/,{timeout:20000}).catch(()=>{});
  ok(/app\/\?view=/.test(G.url()),'“Just look” shows the notebook (view only)');
  // with Pro she can edit
  await G.goto(URL0);await ready(G);await givePro(G);
  await G.goto(URL0+'&share='+code);await ready(G);await G.waitForFunction(()=>cur&&cur._guest,null,{timeout:20000});
  ok(await G.evaluate(()=>cur.title==='Trip to Rome'&&cur.pages.length===2&&!!cur.pages[0]&&$('#block').classList.contains('hidden')&&$('#btitle').readOnly&&!data.some(b=>b._guest)),'Gabi (Pro) opens it to edit: the notebook with its pages (not on her own shelf; no lock, no renaming)');
  await G.evaluate(()=>showEditor(-1));
  ok(await G.evaluate(()=>$('#ed').classList.contains('hidden')),'… she can’t change the cover');
  // Gabi draws on page 1 and adds a page
  await G.evaluate(async()=>{const k=document.createElement('canvas');k.width=900;k.height=1200;const x=k.getContext('2d');x.fillStyle='#8a66d6';x.fillRect(150,150,600,600);cur.pages[0]=k.toDataURL('image/webp',.9);PK.forEach(a=>{if(a==='pages')cur.pages.push(null)});persist()});
  await O.waitForFunction(()=>{const b=data.find(x=>x.title==='Trip to Rome');return b&&b.pages.length===3},null,{timeout:25000});
  ok(await O.evaluate(g=>data.find(x=>x.title==='Trip to Rome').pages[0]===g,await G.evaluate(()=>cur.pages[0])),'her drawing and her new page come into Olga’s notebook');
  await V.waitForFunction(()=>cur.pages.length===3&&/· 3 pages/.test($('#vlive').textContent),null,{timeout:20000});
  ok(true,'… and the open link shows 3 pages now');
  // stop sharing
  await O.click('#shno');await O.evaluate(()=>showBrowse(data.find(b=>b.title==='Trip to Rome')));await O.waitForTimeout(300);await O.click('#bshare');await O.waitForSelector('#sh-livep:not(.hidden)');
  await O.click('#sh-stop');const ts=Date.now();await O.click('#sh-stop');
  const fast=await O.evaluate(()=>!data.find(b=>b.title==='Trip to Rome').share&&!$('#sh-live').classList.contains('hidden'))&&Date.now()-ts<1000;
  await V.waitForFunction(()=>$('#boot').classList.contains('msg')&&/isn’t shared any more/.test($('#boot').textContent),null,{timeout:15000}).catch(()=>{});const tv=Date.now()-ts;
  ok(fast&&tv<5000,'“Stop sharing” answers at once, and the open link says “This notebook isn’t shared any more” '+(tv/1000).toFixed(1)+' s later');
  let gone0=0;for(let i=0;i<50&&!gone0;i++){if((await admin('shares/'+code,null,'GET')).status===404&&(await admin('shares/'+code+'/r/p~0',null,'GET')).status===404)gone0=1;else await new Promise(r=>setTimeout(r,200))}
  ok(gone0,'… and its pages are removed from the cloud in the background');
  // a free account can't make a live link
  await U.evaluate(()=>showBrowse(data[0]));await U.click('#bshare');await U.waitForSelector('#shd:not(.hidden)');
  ok(await U.evaluate(()=>!$('#sh-pro').classList.contains('hidden')),'free plan: “Live link” has a Pro badge');
  await U.click('#sh-live');await U.waitForTimeout(300);
  ok(await U.evaluate(()=>!$('#up').classList.contains('hidden')&&/Live links are part of Pro/.test($('#upm').textContent)),'… and opens the Pro window');
  // ---- a big notebook (40 pages from a PDF, some with writing): the link works at once and the pages go up one by one
  await O.click('#shno');
  await O.evaluate(async()=>{const pg=i=>{const k=document.createElement('canvas');k.width=900;k.height=1200;const x=k.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,900,1200);x.fillStyle='#222';x.font='bold 90px sans-serif';x.fillText('Page '+(i+1),80,160);for(let y=260;y<1100;y+=40)x.fillRect(80,y,700-(y*7%300),14);return k.toDataURL('image/webp',.8)};
    const ink=()=>{const k=document.createElement('canvas');k.width=900;k.height=1200;const x=k.getContext('2d');x.strokeStyle='#d33';x.lineWidth=12;x.beginPath();x.moveTo(100,900);x.lineTo(800,1000);x.stroke();return k.toDataURL('image/png')};
    const b=mk('Study guide',data.length,'p');b.pages=[];for(let i=0;i<40;i++){b.pages.push(i%13===2?ink():null);b.bg[i]=pg(i)}data.push(b);persist();await saveNow();showBrowse(b)});
  await O.waitForTimeout(800);
  await O.evaluate(()=>{window._pt=[];const p0=shareProg;shareProg=function(b){p0(b);const e=$('#sh-prog');if(e&&!e.classList.contains('hidden'))window._pt.push(e.textContent)};
    const f0=shPushMany;window._bad=true;shPushMany=function(c,items,guest,done){ // page 6 can't go up (a bad connection)
      if(!window._bad)return f0.call(this,c,items,guest,done);const bad=items.filter(it=>it.k==='p~5');bad.forEach(it=>done(it.k,undefined,{code:'unavailable'}));return f0.call(this,c,items.filter(it=>it.k!=='p~5'),guest,done)}});
  const t3=Date.now();await O.click('#bshare');await O.click('#sh-live');await O.waitForSelector('#sh-livep:not(.hidden)',{timeout:30000});const took3=Date.now()-t3;
  const link3=await O.evaluate(()=>$('#sh-url').value),code3=link3.split('/').pop();
  ok(took3<4000,'a 40-page notebook: the link is ready at once ('+(took3/1000).toFixed(1)+' s) – the pages go up in the background');
  const V3=await CV.newPage();V3.errs=[];V3.on('pageerror',e=>V3.errs.push('V3: '+e.message));await V3.goto(link3+'?emu=127.0.0.1');
  await V3.waitForURL(/view=/,{timeout:15000});await vReady(V3);
  ok(await V3.evaluate(()=>/Opening the notebook/.test($('#boott').textContent)&&['app','lib','cloud'].every(k=>$('#boot [data-s="'+k+'"]').dataset.st==='ok')),'opening the link: Foliet’s start window first (“Opening the notebook” – the notebook, then the first pages)');
  ok(await V3.evaluate(()=>!!SHS[VIEWC].h.meta&&[0,1].every(i=>!pendPg(cur,i))),'… it closes once the cover and the first pages are there');
  await V3.waitForFunction(()=>cur.pages.length===40,null,{timeout:20000});
  ok(true,'the book has a place for all 40 pages');
  await O.waitForFunction(()=>{const S=SHS[cur.share.code];return S&&!S.prog&&!S.busy},null,{timeout:60000});
  ok(await O.evaluate(()=>window._pt.some(t=>/Putting the pages online… \d+ of 40 pages/.test(t))&&!!$('#sh-prog .shp-bar i')),'the Share window shows a bar and “Putting the pages online… N of 40 pages” meanwhile');
  ok(await O.evaluate(()=>/39 of 40 pages are online\. The others go up/.test($('#sh-prog').textContent)),'… then how many are online: “39 of 40 pages are online. The others go up…”');
  await V3.waitForFunction(()=>/39 of 40 pages online/.test($('#vlive').textContent),null,{timeout:10000}).catch(()=>{});
  ok(await V3.evaluate(()=>/39 of 40 pages online/.test($('#vlive').textContent)),'the link says how many pages are there: “39 of 40 pages online”');
  await O.click('#shno');
  const pl=await O.evaluate(()=>{const S=SHS[cur.share.code];S.prog={done:0,total:9};shareProg(cur);const a=!$('#shpill').classList.contains('hidden')&&$('#shpill').textContent;S.prog=null;shareProg(cur);const b2=$('#shpill').textContent;return [a,b2]});
  ok(/Live link · 39 of 40 pages online/.test(pl[0])&&/39 of 40 pages online – the others go up later/.test(pl[1]),'with the Share window closed, a pill shows it: “'+pl[0]+'”');
  const m3=(await (await admin('shares/'+code3,null,'GET')).json()).fields.m.mapValue.fields;
  ok(Object.keys(m3).length===40&&!m3['p~5']&&m3['p~39']&&m3['meta'],'one page couldn’t go up (connection): the other 40 are in the link anyway ('+Object.keys(m3).length+' of 41)');
  await V3.waitForFunction(()=>{const p=PEND.get(String(cur.id));return p&&p.size===1&&p.has(5)},null,{timeout:20000}).catch(()=>{});
  ok(await V3.evaluate(()=>{const p=PEND.get(String(cur.id));return p&&p.size===1&&p.has(5)}),'the other 39 pages all came to the link (8 at a time, the ones near the open pages first)');
  await V3.evaluate(()=>flip(2));await V3.waitForFunction(()=>cs===2&&!flipping,null,{timeout:15000});await V3.waitForTimeout(300);
  ok(await V3.evaluate(()=>$('#pr').classList.contains('ld')&&$('#pr').classList.contains('wait')&&getComputedStyle($('#pr'),'::after').content.includes('Not online yet')),'the page that didn’t go up says “Not online yet” (not a blank page)');
  await V3.evaluate(()=>flip(1));await V3.waitForFunction(()=>cs===1&&!flipping,null,{timeout:15000});await V3.waitForTimeout(300);
  ok(await V3.evaluate(()=>!!$('#pl img.ink2')),'a PDF page with writing shows the page with the writing on top, like in the app');
  await V3.evaluate(()=>flip(2));await V3.waitForFunction(()=>cs===2&&!flipping,null,{timeout:15000});
  const r0=JSON.parse((await (await admin('shares/'+code3+'/r/p~0',null,'GET')).json()).fields.d.stringValue);
  ok(r0.v===''&&/^data:image\/webp/.test(r0.r.bg),'a PDF page goes up once – no second picture for the link (lighter, faster)');
  // Olga closes Foliet and opens it again: the page that didn't go up goes up now, by itself
  await O.reload();await ready(O);
  await V3.waitForFunction(()=>!$('#pr').classList.contains('ld')&&!!$('#pr img'),null,{timeout:30000}).catch(()=>{});
  ok(await V3.evaluate(()=>!$('#pr').classList.contains('ld')&&!!$('#pr img')),'Foliet opened again: page 6 goes up by itself and appears in the open link');
  ok(await V3.evaluate(()=>/· 40 pages$/.test($('#vlive').textContent)),'… and it says “40 pages” (all there)');
  await V3.evaluate(()=>flip(19));await V3.waitForFunction(()=>cs===19&&!flipping,null,{timeout:20000});
  ok(await V3.evaluate(()=>!!$('#pr img')&&!!$('#pl img')),'the last pages are there too');
  await O.evaluate(()=>shareEnd(data.find(b=>b.title==='Study guide')));await V3.close();await O.waitForTimeout(1500);
  // ---- stopping while the pages are still going up: the link stops at once, and nothing of it is left in the cloud
  await O.evaluate(()=>showBrowse(data.find(b=>b.title==='Study guide')));await O.waitForTimeout(600);
  await O.evaluate(()=>{const f0=window._spm=shPushMany;shPushMany=async function(c,items,g,done){ // a slow connection: 3 pages at a time, with a pause
    for(let i=0;i<items.length;i+=3){if(SHS[c]&&SHS[c].dead){items.slice(i).forEach(it=>done(it.k,undefined,null));return}await new Promise(r=>setTimeout(r,400));await f0.call(this,c,items.slice(i,i+3),g,done)}}});
  await O.click('#bshare');await O.click('#sh-live');await O.waitForSelector('#sh-livep:not(.hidden)',{timeout:30000});
  const code4=await O.evaluate(()=>cur.share.code);await O.waitForTimeout(1500);
  const up4=await O.evaluate(()=>{const S=SHS[cur.share.code];return !!S.prog&&S.prog.done<S.prog.total});
  await O.click('#sh-stop');const t4=Date.now();await O.click('#sh-stop');
  let off4=0;for(let i=0;i<100&&!off4;i++){const r=await admin('shares/'+code4,null,'GET');if(r.status===404)off4=Date.now();else{const j=await r.json();if(j.fields&&j.fields.on&&j.fields.on.booleanValue===false)off4=Date.now()}if(!off4)await new Promise(r=>setTimeout(r,50))}
  ok(up4&&off4&&off4-t4<2000&&await O.evaluate(()=>!cur.share&&$('#shpill').classList.contains('hidden')),'stopping while the pages are still going up: the link stops at once ('+((off4-t4)/1000).toFixed(1)+' s), nothing keeps showing its progress');
  let left4=1;for(let i=0;i<100&&left4;i++){const st=await Promise.all(['','/r/meta','/r/p~0','/r/p~1','/r/p~5','/r/p~39'].map(x=>admin('shares/'+code4+x,null,'GET').then(r=>r.status)));left4=st.some(x=>x!==404);if(left4)await new Promise(r=>setTimeout(r,300))}
  ok(!left4&&await O.evaluate(()=>!JSON.parse(localStorage.getItem('sb-shend:'+ACC.user.uid)||'[]').length),'… and nothing of it is left in the cloud (the pages that went up are removed too)');
  await O.evaluate(()=>{shPushMany=window._spm});await O.click('#shno');
  await O.evaluate(()=>showBrowse(data.find(b=>b.title==='Trip to Rome')));await O.waitForTimeout(300);await O.click('#bshare');await O.waitForSelector('#shd:not(.hidden)');
  // your data (GDPR): the live links are in “Download my data” and go with “Delete my account”
  await O.click('#shno');await O.evaluate(()=>showBrowse(data.find(b=>b.title==='Trip to Rome')));await O.waitForTimeout(300);await O.click('#bshare');await O.click('#sh-live');await O.waitForSelector('#sh-url',{timeout:30000});
  await O.waitForFunction(()=>/\/trip-to-rome\//.test($('#sh-url').value),null,{timeout:30000});const code2=await O.evaluate(()=>$('#sh-url').value.split('/').pop());await O.click('#shno');await O.waitForTimeout(2500);
  const recs=await O.evaluate(()=>myRecords());
  ok(recs.liveLinks.length===1&&/\/trip-to-rome\//.test(recs.liveLinks[0].link)&&recs.liveLinks[0].title==='Trip to Rome','“Download my data” lists your live links');
  ok(await G.evaluate(c=>{const F=ACC.F;return F.getDocs(F.query(F.collection(ACC.db,'shares'),F.where('owner','==',c))).then(()=>'ok',e=>e.code)},await O.evaluate(()=>ACC.user.uid))==='permission-denied','nobody can list someone else’s links');
  await O.evaluate(()=>closeBook&&!$('#bv').classList.contains('hidden')?closeBook():0);await O.waitForTimeout(500);
  await O.click('#menub');await O.click('#accb');await O.click('.acc-legal >> text=Delete my account');await O.waitForSelector('#del-pw');
  await O.fill('#del-pw','secret123');await O.click('#lockc .btn.danger');await O.waitForFunction(()=>!ACC.user,null,{timeout:20000}).catch(()=>{});await O.waitForTimeout(1000);
  const gone=await (await admin('shares/'+code2,null,'GET')).status,gone2=await (await admin('shares/'+code2+'/r/meta',null,'GET')).status;
  ok(gone===404&&gone2===404,'“Delete my account” removes your live links too');
  // an address that isn't a notebook
  const V2=await CV.newPage();await V2.goto(BASE+'nothing-here');await V2.waitForTimeout(800);
  ok(await V2.evaluate(()=>/Page not found/.test(document.body.textContent)),'other addresses that don’t exist: “Page not found”');

  [...A.errs,...U.errs,...Wn.errs,...O.errs,...V.errs,...G.errs].forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
