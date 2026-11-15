// Update 6: feedback, template store (free + paid, template codes, admin), cover designs, PDF import (cover = page 1),
// download my data, delete my account.
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node update6-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','app'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
const getDoc=async p=>{const r=await admin(p,null,'GET');return r.status===200?r.json():null};
const listDocs=async c=>{const r=await admin(c,null,'GET');const j=await r.json();return j.documents||[]};
(async()=>{
  require('http').createServer((q,res)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!f.startsWith('/app/')){res.writeHead(404);return res.end()}
    f=path.join(ROOT,f.slice(4));if(f.endsWith(path.sep)||f===ROOT)f=path.join(f,'index.html');
    if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))}else{res.writeHead(404);res.end('nf')}}).listen(5179,'127.0.0.1');
  const b=await chromium.launch();
  const user=async(em,opts={})=>{
    const ctx=await b.newContext({viewport:{width:1100,height:820},acceptDownloads:true});
    await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});
    await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
    const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(em+': '+e.message));
    await p.goto('http://127.0.0.1:5179/app/?emu=127.0.0.1'+(opts.demo?'&demo='+opts.demo:''));await p.waitForSelector('#a-em',{timeout:15000});
    await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');
    await p.waitForFunction(()=>ACC.libUid&&!ACC.gate,null,{timeout:20000});
    await answerSurvey(p);await p.waitForTimeout(500);
    p.uid=await p.evaluate(()=>ACC.user.uid);return p;
  };
  const tryWrite=(p,fn,arg)=>p.evaluate(fn,arg).catch(e=>'ERR '+e.message);
  const toastTxt=p=>p.evaluate(()=>document.querySelector('#sv').textContent);

  // ---- feedback
  const A=await user('owner@example.com');
  await admin('admins/'+A.uid,{fields:{note:{stringValue:'test'}}});await A.evaluate(()=>checkAdmin(ACC.user));
  await A.click('#menub');await A.click('#mfb');await A.waitForSelector('#fbk');
  ok(await A.evaluate(()=>document.querySelector('#fbk .btn').disabled),'feedback: Send is off until something is written');
  await A.click('#fbk .seg2 [data-k="problem"]');await A.fill('#fbk textarea','The eraser is too small on my phone.');await A.click('#fbk .btn');
  await A.waitForSelector('#fbk',{state:'detached',timeout:10000});
  ok(/Thank you/.test(await toastTxt(A)),'feedback is sent, with a thank-you message');
  let fb=await listDocs('feedback');
  ok(fb.length===1&&fb[0].fields.type.stringValue==='problem'&&/eraser/.test(fb[0].fields.text.stringValue)&&fb[0].fields.email.stringValue==='owner@example.com'&&fb[0].fields.reply.booleanValue===true,'feedback saved with type, text, email and "you can reply"');
  await A.click('#menub');await A.click('#mfb');await A.fill('#fbk textarea','Second message right away');await A.click('#fbk .btn');await A.waitForTimeout(500);
  ok(/wait/.test(await A.evaluate(()=>document.querySelector('#fbk .lk-err').textContent)),'a second message within a minute is asked to wait');
  await A.click('#fbk .ib.i');
  const B=await user('bob@example.com');
  const f1=await tryWrite(B,async()=>{const F=ACC.F;try{await F.setDoc(F.doc(F.collection(ACC.db,'feedback')),{uid:'someone-else',email:'x@y.z',type:'idea',text:'hello there',reply:false,os:'mac',ver:'Beta',w:100,at:F.serverTimestamp()});return 'saved!'}catch(e){return e.code}});
  ok(f1==='permission-denied','the rules refuse feedback sent in someone else\'s name ('+f1+')');
  const f2=await tryWrite(B,async()=>{const F=ACC.F;try{await F.getDocs(F.collection(ACC.db,'feedback'));return 'listed!'}catch(e){return e.code}});
  ok(f2==='permission-denied','users can\'t read other people\'s feedback ('+f2+')');
  await A.click('#menub');await A.click('#madm');await A.waitForSelector('#adm-fbl',{timeout:15000});
  ok(await A.evaluate(()=>/eraser is too small/.test($('#adm-fbl').textContent)&&/Problem/.test($('#adm-fbl').textContent)&&/1 not done yet/.test($('#adm-body').textContent)),'admin sees the feedback (type, text, "1 not done yet")');
  await A.click('#adm-fbl .arow >> text=Mark done');await A.waitForTimeout(800);
  ok((await listDocs('feedback'))[0].fields.done.booleanValue===true&&await A.evaluate(()=>/0 not done yet/.test($('#adm-body').textContent)),'admin marks it done');

  // ---- template store
  await B.click('#tb2');await B.waitForSelector('.tstore',{timeout:10000});
  const cards=await B.evaluate(()=>({all:document.querySelectorAll('#tpl .tcardx').length,free:document.querySelectorAll('#tpl .tprice.free').length,lock:document.querySelectorAll('#tpl .tcardx.lock').length,price:[...document.querySelectorAll('#tpl .tcardx.lock .tprice')].every(e=>e.textContent==='€0.99')}));
  ok(cards.all===17&&cards.free===8&&cards.lock===9&&cards.price,'store: 17 templates, 8 free, 9 locked at €0.99 ('+JSON.stringify(cards)+')');
  await B.click('.tchips >> text=Free');await B.waitForTimeout(200);
  ok(await B.evaluate(()=>document.querySelectorAll('#tpl .tcardx').length===8&&!document.querySelector('#tpl .tcardx.lock')),'filter "Free" shows only the 8 free ones');
  await B.click('.tchips >> text=All');await B.waitForTimeout(200);
  await B.click('#tpl .tcardx[data-t="cornell"]');await B.waitForSelector('#t-new');
  ok(await B.evaluate(()=>/Free template/.test($('#lockc').textContent)&&/New notebook with these pages/.test($('#t-new').textContent)),'tapping a free template: "✓ Free template" + "New notebook with these pages"');
  await B.click('#t-new');await B.waitForSelector('#bv:not(.hidden)',{timeout:10000});
  ok(await B.evaluate(()=>cur.title==='Cornell notes'&&cur.pages.length===8&&cur.design==='frame'&&cur.bg.filter(Boolean).length===8&&cur.ps.every((s,i)=>s.p==='tpl'&&s.t==='cornell'&&s.k===i)),'a notebook made of the template (Cornell notes, 8 template pages, cover design)');
  await B.click('#bclose');await B.waitForTimeout(400);await B.click('#tb2');await B.waitForTimeout(300);
  const nb0=await B.evaluate(()=>data.length);
  await B.click('#tpl .tcardx[data-t="habit"]');await B.waitForSelector('#lockd:not(.hidden) .tbuy');
  ok(await B.evaluate(()=>/Habit tracker/.test($('#lockc').textContent)&&/€0\.99/.test($('#lockc .tbuy').textContent)),'a paid template opens "Buy for €0.99"');
  await B.click('#lockc .tbuy');await B.waitForTimeout(200);
  ok(await B.evaluate(n=>/opens soon/.test($('#lockc .cmsg').textContent)&&data.length===n,nb0),'buying isn\'t open yet: it says so and makes no notebook');
  const t1=await tryWrite(B,async()=>{const F=ACC.F;try{await F.setDoc(F.doc(ACC.db,'owned',ACC.user.uid),{t:['habit'],last:'FREEBIE'});return 'saved!'}catch(e){return e.code}});
  ok(t1==='permission-denied','the rules stop people giving themselves a template ('+t1+')');
  await B.click('#lockc >> text=Not now');
  // admin makes a template code
  await A.click('#adm-r');await A.waitForSelector('#adm-cf',{timeout:15000});
  await A.fill('#adm-cf input[placeholder="CODE"]','HABIT-1');await A.selectOption('#adm-kind','tpl');await A.selectOption('#adm-ctpl','habit');await A.fill('#adm-cf input[type=number]','1');
  await A.click('#adm-cf >> text=Create code');await A.waitForSelector('#adm-codes >> text=HABIT-1',{timeout:10000});
  const hc=await getDoc('codes/HABIT-1');
  ok(hc&&hc.fields.kind.stringValue==='tpl'&&hc.fields.tpl.stringValue==='habit'&&hc.fields.max.integerValue==='1'&&!hc.fields.days,'admin makes a template code (Habit tracker, 1 person)');
  ok(await A.evaluate(()=>/Unlocks: Habit tracker/.test($('#adm-codes').textContent)),'the code list says what it unlocks');
  // Bob redeems it from the buy window
  await B.click('#tpl .tcardx[data-t="habit"]');await B.waitForSelector('#t-code');await B.fill('#t-code','habit-1');await B.click('#lockc .codebox button');
  await B.waitForFunction(()=>ACC.owned.has('habit'),null,{timeout:10000}).catch(()=>{});
  ok(await B.evaluate(()=>ACC.owned.has('habit')&&$('#lockd').classList.contains('hidden')),'Bob types the code (lower case) → Habit tracker is his');
  await B.waitForTimeout(400);
  ok(await B.evaluate(()=>{const c=document.querySelector('#tpl .tcardx[data-t="habit"]');return c&&!c.classList.contains('lock')&&/Yours/.test(c.querySelector('.tprice').textContent)}),'the store shows it as "✓ Yours"');
  const ow=await getDoc('owned/'+B.uid);
  ok(ow&&ow.fields.t.arrayValue.values.map(v=>v.stringValue).join()==='habit'&&ow.fields.last.stringValue==='HABIT-1'&&(await getDoc('codes/HABIT-1')).fields.used.integerValue==='1','saved: owned = [habit], the code is used 1 / 1');
  await B.click('#tpl .tcardx[data-t="habit"]');await B.waitForSelector('#t-new');
  ok(await B.evaluate(()=>/You own this template/.test($('#lockc').textContent)),'tapping it now says "✓ You own this template"');
  await B.click('#t-new');await B.waitForSelector('#bv:not(.hidden)',{timeout:10000});
  ok(await B.evaluate(()=>cur.title==='Habit tracker'&&cur.pages.length===12&&cur.o==='l'),'he can use it: Habit tracker notebook, 12 landscape pages');
  await B.click('#bclose');await B.waitForTimeout(300);
  await B.reload();await B.waitForFunction(()=>ACC.libUid&&!ACC.gate,null,{timeout:20000});await B.waitForTimeout(800);
  ok(await B.evaluate(()=>ACC.owned.has('habit')&&JSON.parse(localStorage.getItem('sb-own:'+ACC.user.uid)).includes('habit')),'after reopening the app it\'s still his (also kept on the device for offline)');
  // add a template's pages to a notebook you already have
  await B.click('#tb2');await B.waitForSelector('.tstore');await B.click('#tpl .tcardx[data-t="cornell"]');await B.waitForSelector('#t-book');
  const hid=await B.evaluate(()=>String(data.find(x=>x.title==='Habit tracker').id));
  await B.selectOption('#t-book',hid);await B.selectOption('#t-n','2');await B.click('#t-add');await B.waitForSelector('#bv:not(.hidden)',{timeout:10000});await B.waitForTimeout(500);
  ok(await B.evaluate(()=>cur.title==='Habit tracker'&&cur.pages.length===14&&cur.ps[12].t==='cornell'&&cur.ps[12].k===0&&cur.ps[13].k===1&&!!cur.bg[13]&&cur.cs===6),'"Add" puts 2 Cornell notes pages at the end of the Habit tracker notebook and opens it there');
  ok(/Added 2 pages of Cornell notes to Habit tracker/.test(await toastTxt(B)),'it says what it added');
  await B.click('#bclose');await B.waitForTimeout(300);
  // Carol: used-up code, a trick with the wrong template, then a real code in the account window
  const C=await user('carol@example.com');
  await C.click('#tb2');await C.waitForSelector('.tstore');
  await C.click('#tpl .tcardx[data-t="habit"]');await C.waitForSelector('#t-code');await C.fill('#t-code','HABIT-1');await C.click('#lockc .codebox button');await C.waitForTimeout(1500);
  ok(/used up|expired/.test(await C.evaluate(()=>$('#lockc .cmsg').textContent)),'a used-up template code is refused');
  await C.click('#lockc >> text=Not now');
  await admin('codes/COMIC-5',{fields:{kind:{stringValue:'tpl'},tpl:{stringValue:'comic'},max:{integerValue:'5'},used:{integerValue:'0'},active:{booleanValue:true},note:{stringValue:''}}});
  const t2=await tryWrite(C,async()=>{const F=ACC.F,db=ACC.db,u=ACC.user.uid;try{await F.runTransaction(db,async tx=>{const c=(await tx.get(F.doc(db,'codes','COMIC-5'))).data();tx.update(F.doc(db,'codes','COMIC-5'),{used:c.used+1});tx.set(F.doc(db,'redeem',u+'_COMIC-5'),{uid:u,code:'COMIC-5',at:F.serverTimestamp()});tx.set(F.doc(db,'owned',u),{t:['all'],last:'COMIC-5'})});return 'written!'}catch(e){return e.code}});
  ok(t2==='permission-denied','a code for one template can\'t unlock all of them ('+t2+')');
  const t3=await tryWrite(C,async()=>{const F=ACC.F,db=ACC.db,u=ACC.user.uid;try{await F.runTransaction(db,async tx=>{const c=(await tx.get(F.doc(db,'codes','COMIC-5'))).data();tx.update(F.doc(db,'codes','COMIC-5'),{used:c.used+1});tx.set(F.doc(db,'redeem',u+'_COMIC-5'),{uid:u,code:'COMIC-5',at:F.serverTimestamp()});tx.set(F.doc(db,'pro',u),{code:'COMIC-5',by:'code',since:F.serverTimestamp(),days:0})});return 'written!'}catch(e){return e.code}});
  ok(t3==='permission-denied','a template code can\'t be turned into Pro ('+t3+')');
  await C.click('#menub');await C.click('#accb');await C.waitForSelector('#a-code');await C.fill('#a-code','comic-5');await C.click('.codebox button');
  await C.waitForFunction(()=>ACC.owned.has('comic'),null,{timeout:10000}).catch(()=>{});
  ok(await C.evaluate(()=>ACC.owned.has('comic')&&!ACC.pro),'a template code also works in the account window (Comic book), and doesn\'t give Pro');
  ok(/Comic book is yours/.test(await toastTxt(C)),'it says "Comic book is yours"');
  await C.click('#acc-x').catch(()=>{});
  // admin gives all paid templates by email
  await A.click('#adm-r');await A.waitForSelector('#adm-tf',{timeout:15000});
  await A.fill('#adm-tf input[type=email]','carol@example.com');await A.selectOption('#adm-tf select','all');await A.click('#adm-tf button[type=submit]');
  await C.waitForFunction(()=>ACC.owned.has('all'),null,{timeout:10000}).catch(()=>{});
  await C.waitForTimeout(400);
  ok(await C.evaluate(()=>ACC.owned.has('all')&&ACC.owned.has('comic')&&!document.querySelector('#tpl .tcardx.lock')),'admin gives Carol all paid templates by email → nothing is locked for her');
  // ---- templates in your notebooks: a new notebook starting with a template, new pages, page style; the cover label while turning
  await C.click('#tb1');await C.waitForTimeout(300);
  await C.click('.cell.add');await C.waitForSelector('#dlg:not(.hidden) #dpg:not(.hidden)');await C.waitForSelector('#dtpl [data-p="tpl:comic"]');
  ok(await C.evaluate(()=>document.querySelectorAll('#dpats button').length===4&&document.querySelectorAll('#dtpl button').length===17&&/change any page later with Page style/.test($('#dpg').textContent)),'"New notebook" asks how the pages look: blank, lined, grid, dots or one of her 17 templates (and says it can be changed later)');
  await C.click('#dlg .opts [data-o="l"]');await C.click('#dtpl [data-p="tpl:comic"]');await C.click('#dyes');await C.waitForSelector('#bv:not(.hidden)');
  ok(await C.evaluate(()=>cur.o==='l'&&cur.ps[0]&&cur.ps[0].p==='tpl'&&cur.ps[0].t==='comic'&&!!cur.bg[0]),'the new landscape notebook starts with a Comic book page');
  const lb=await C.evaluate(()=>{prep(0);setAng(60);const l=document.querySelector('#fl .lbl'),r=l.getBoundingClientRect(),w=document.querySelector('#fl .sl').offsetWidth,f=parseFloat(getComputedStyle(l).fontSize);endFlip(false);return {f,w,h:Math.round(r.height)}});
  ok(lb.f<lb.w*.2&&lb.h<lb.w,'the name on the cover keeps its size while the cover turns ('+JSON.stringify(lb)+')');
  await C.click('#badd');await C.waitForSelector('#npd:not(.hidden)');await C.waitForSelector('#nptpl button');
  ok(await C.evaluate(()=>document.querySelectorAll('#nptpl button').length===17),'"New pages" also offers her templates');
  await C.click('#npyes');await C.waitForTimeout(1200);
  ok(await C.evaluate(()=>cur.pages.length===4&&cur.ps.slice(1).every((s,i)=>s.p==='tpl'&&s.t==='comic'&&s.k===i+1)&&!!cur.bg[3]),'"Like the last page" adds more Comic book pages');
  await C.click('#badd');await C.waitForSelector('#nptpl [data-p="tpl:music"]');await C.click('#nptpl [data-p="tpl:music"]');await C.click('#npyes');await C.waitForTimeout(1200);
  ok(await C.evaluate(()=>cur.pages.length===6&&cur.ps[4].t==='music'&&cur.ps[5].t==='music'&&cur.ps[5].k===1),'… or pages of another template (Sheet music)');
  await C.evaluate(()=>showEditor(1));await C.waitForTimeout(700);
  await C.click('#pstyle');await C.waitForSelector('#ptpl button');
  ok(await C.evaluate(()=>document.querySelector('#ptpl [data-p="tpl:comic"]').getAttribute('aria-pressed')==='true'),'Page style shows which template the page uses');
  await C.click('#pats [data-p="lines"]');await C.waitForTimeout(700);
  ok(await C.evaluate(()=>cur.ps[1].p==='lines'&&!cur.ps[1].t&&!cur.bg[1]&&!$('#bgimg').classList.contains('on')),'Page style → Lined turns a template page into a lined page');
  await C.click('#ptpl [data-p="tpl:recipe"]');await C.waitForTimeout(900);
  ok(await C.evaluate(()=>cur.ps[1].p==='tpl'&&cur.ps[1].t==='recipe'&&!!cur.bg[1]&&$('#bgimg').classList.contains('on')),'… and into another template (Recipe book)');
  const bg0=await C.evaluate(()=>cur.bg[1]);
  await C.click('#pcols [data-c="#000000"]');await C.waitForTimeout(900);
  ok(await C.evaluate(b0=>cur.ps[1].c==='#000000'&&cur.ps[1].t==='recipe'&&cur.bg[1]!==b0,bg0),'on black paper the template is drawn again with light lines');
  await C.click('#psx');await C.click('#plus');await C.click('#stabs [data-p="stick"]');await C.waitForTimeout(300);
  ok(await C.evaluate(()=>document.querySelectorAll('#spane .eg.st').length===5&&!!document.querySelector('#spane [data-pk="stk-space"]')),'with everything unlocked, + → Stickers shows all 5 packs');
  await C.click('#stabs [data-p="label"]');await C.waitForSelector('#spane [data-l="lbl-gold"]');
  ok(await C.evaluate(()=>document.querySelectorAll('#spane [data-l]').length===12),'… and + → Labels all 12 labels');
  await C.click('#shx');await C.evaluate(()=>{$('#ed').classList.add('hidden');showBrowse()});await C.click('#bclose');await C.waitForTimeout(300);
  await A.waitForSelector('#adm-tf',{timeout:15000});await A.waitForTimeout(300);
  const card=(p,label)=>p.evaluate(l=>{const c=[...document.querySelectorAll('#adm-body .acard')].find(x=>x.querySelector('span').textContent===l);return c?c.querySelector('b').textContent:null},label);
  ok(await card(A,'People with paid items')==='2'&&await card(A,'Have everything')==='1'&&await card(A,'Items unlocked')==='2','admin → Store: 2 people with paid items, 1 has everything, 2 unlocked one by one');
  const [dl]=await Promise.all([A.waitForEvent('download'),A.click('text=Download all (CSV)')]);
  const csv=fs.readFileSync(await dl.path(),'utf8');
  ok(/"store_items"/.test(csv)&&/Habit tracker/.test(csv)&&/Everything in the store/.test(csv),'the CSV has a store_items column');
  await A.click('#adm-x');

  // ---- cover designs
  await B.evaluate(()=>{showBrowse(data.find(x=>x.title==='Cornell notes'));showEditor(-1)});await B.waitForTimeout(600);
  await B.click('#cst');await B.waitForSelector('#csheet:not(.hidden)');
  ok(await B.evaluate(()=>document.querySelectorAll('#cdes button').length===17&&!$('#cdes [data-k="galaxy"]')&&/More covers in the Store/.test($('#cdes').textContent)),'Cover style: None + the 16 free designs (paid ones are in the Store)');
  await B.click('#cdes [data-k="waves"]');await B.waitForTimeout(200);
  ok(await B.evaluate(()=>cur.design==='waves'&&/svg/.test($('#paper').style.backgroundImage)),'choosing "Waves" paints it on the cover');
  await B.click('#cdes [data-k=""]');await B.waitForTimeout(100);
  ok(await B.evaluate(()=>!cur.design),'"None" takes the design off');
  await B.click('#cdes [data-k="stars"]');await B.click('#csx');
  await B.evaluate(()=>{$('#ed').classList.add('hidden');showBrowse()});await B.click('#bclose');await B.waitForTimeout(500);
  ok(await B.evaluate(()=>{const c=[...document.querySelectorAll('.cell:not(.add)')].find(x=>/Cornell notes/.test(x.textContent));return c&&/svg/.test(c.querySelector('.front').style.getPropertyValue('--ct'))}),'the shelf shows the cover with its design');

  // ---- labels: the name tag becomes a label you can move; more shapes in + → Labels; retype; a rename follows
  await B.evaluate(()=>{showBrowse(data.find(x=>x.title==='Cornell notes'));showEditor(-1)});await B.waitForTimeout(900);
  ok(await B.evaluate(()=>cur.cobjs.length===1&&cur.cobjs[0].lb&&cur.cobjs[0].lb.id==='lbl-classic'&&cur.cobjs[0].lb.t==='Cornell notes'&&!!cur.cpv),'editing a plain cover turns its name tag into a label object (Classic, "Cornell notes")');
  await B.click('#plus');await B.click('#stabs [data-p="label"]');await B.waitForSelector('#spane [data-l]');
  ok(await B.evaluate(()=>document.querySelectorAll('#spane [data-l]').length===6&&!document.querySelector('#spane [data-l="lbl-gold"]')&&/More labels are in the Store/.test($('#spane').textContent)),'+ → Labels: the 6 free shapes (the paid ones are in the Store)');
  await B.click('#spane [data-l="lbl-strip"]');await B.waitForTimeout(900);
  ok(await B.evaluate(()=>cur.cobjs.length===2&&cur.cobjs[1].lb.id==='lbl-strip'&&cur.cobjs[1].y>cur.cobjs[0].y&&!!selO&&selO._o===cur.cobjs[1]),'a Long strip label is added (below the first one) and selected');
  await B.click('#o-edit');await B.waitForSelector('#lb-t');await B.fill('#lb-t','Summer 2026');await B.press('#lb-t','Enter');await B.waitForTimeout(800);
  ok(await B.evaluate(()=>cur.cobjs[1].lb.t==='Summer 2026'&&/^data:image\/png/.test(cur.cobjs[1].src)),'✎ changes the words on the label');
  await B.click('#photo');await B.waitForSelector('#up:not(.hidden)');
  ok(await B.evaluate(()=>/photo on the cover is part of Pro/.test($('#upm').textContent)),'free plan: a photo on the cover asks for Pro');
  await B.click('#upno');
  await B.evaluate(()=>{$('#ed').classList.add('hidden');showBrowse()});await B.waitForTimeout(300);
  await B.fill('#btitle','School notes');await B.waitForTimeout(1500);
  ok(await B.evaluate(()=>cur.cobjs[0].lb.t==='School notes'&&cur.cobjs[1].lb.t==='Summer 2026'),'renaming the notebook updates the label that showed its name (not the retyped one)');
  await B.click('#bclose');await B.waitForTimeout(300);

  // ---- the store: covers, labels and sticker packs
  await B.click('#tb2');await B.waitForSelector('.skinds');
  const kinds={};for(const k of ['cov','lbl','stk']){await B.click('.skinds [data-k="'+k+'"]');await B.waitForTimeout(300);kinds[k]=await B.evaluate(()=>[document.querySelectorAll('#tpl .tcardx').length,document.querySelectorAll('#tpl .tcardx.lock').length])}
  ok(kinds.cov+''==='22,6'&&kinds.lbl+''==='12,6'&&kinds.stk+''==='5,3','store: 22 covers (6 paid), 12 labels (6 paid), 5 sticker packs (3 paid) ('+JSON.stringify(kinds)+')');
  await B.click('.skinds [data-k="stk"]');await B.waitForTimeout(300);await B.click('#tpl .tcardx[data-t="stk-treats"]');await B.waitForSelector('#lockc .tbuy-pv');await B.waitForTimeout(300);
  ok(await B.evaluate(()=>{const p=$('#lockc .tbuy-pv').getBoundingClientRect(),c=$('#lockc').getBoundingClientRect(),im=[...document.querySelectorAll('#lockc .tbuy-pv img')];return im.length===6&&im.every(i=>{const r=i.getBoundingClientRect();return r.width>10&&r.right<=p.right+1&&r.bottom<=p.bottom+1})&&p.height<c.height/3}),'the sticker pack window shows its 6 stickers small, inside the preview');
  await B.click('#lockc >> text=Not now');
  await admin('codes/GALAXY-1',{fields:{kind:{stringValue:'tpl'},tpl:{stringValue:'cov-galaxy'},max:{integerValue:'5'},used:{integerValue:'0'},active:{booleanValue:true},note:{stringValue:''}}});
  await B.click('.skinds [data-k="cov"]');await B.waitForTimeout(300);
  await B.click('#tpl .tcardx[data-t="cov-galaxy"]');await B.waitForSelector('#t-code');
  ok(await B.evaluate(()=>/€0\.99/.test($('#lockc .tbuy').textContent)&&/Galaxy/.test($('#lockc').textContent)),'a paid cover opens "Buy for €0.99"');
  await B.fill('#t-code','galaxy-1');await B.click('#lockc .codebox button');
  await B.waitForFunction(()=>ACC.owned.has('cov-galaxy'),null,{timeout:10000}).catch(()=>{});
  ok(await B.evaluate(()=>ACC.owned.has('cov-galaxy')),'a store code unlocks the Galaxy cover');
  await B.waitForTimeout(400);await B.click('#tpl .tcardx[data-t="cov-galaxy"]');await B.waitForSelector('#t-use');
  ok(await B.evaluate(()=>/You own this cover/.test($('#lockc').textContent)),'tapping it now says "✓ You own this cover"');
  await B.selectOption('#t-book',hid);await B.click('#t-use');await B.waitForSelector('#bv:not(.hidden)');
  ok(await B.evaluate(()=>cur.title==='Habit tracker'&&cur.design==='galaxy'),'"Use" puts the Galaxy cover on the Habit tracker notebook');
  await B.evaluate(()=>showEditor(-1));await B.waitForTimeout(800);await B.click('#cst');await B.waitForSelector('#csheet:not(.hidden)');
  ok(await B.evaluate(()=>!!$('#cdes [data-k="galaxy"]')&&!$('#cdes [data-k="skyline"]')),'Cover style now lists Galaxy too (not the covers he doesn\'t own)');
  await B.click('#csx');await B.click('#plus');await B.click('#stabs [data-p="stick"]');await B.waitForTimeout(300);
  ok(await B.evaluate(()=>[...document.querySelectorAll('#spane .eg.st')].map(g=>g.dataset.pk).join()==='stk-basics,stk-doodles'&&document.querySelectorAll('#spane .eg.st button').length===38),'+ → Stickers: the free packs, Basics and Doodles (38 stickers)');
  await B.click('#shx');await B.evaluate(()=>{$('#ed').classList.add('hidden');showBrowse()});await B.click('#bclose');await B.waitForTimeout(300);
  await B.click('#tb2');await B.click('.skinds [data-k="lbl"]');await B.waitForTimeout(300);await B.click('#tpl .tcardx[data-t="lbl-oval"]');await B.waitForSelector('#t-use');
  await B.selectOption('#t-book',hid);await B.click('#t-use');await B.waitForSelector('#bv:not(.hidden)');await B.waitForTimeout(400);
  ok(await B.evaluate(()=>cur.title==='Habit tracker'&&cur.cobjs.some(o=>o.lb&&o.lb.id==='lbl-oval'&&o.lb.t==='Habit tracker')&&!!cur.cpv),'store → Oval label → "Add" puts it on the Habit tracker cover');
  await B.click('#bclose');await B.waitForTimeout(300);

  // ---- paper colors: black, bright white, warm white, any color
  await B.evaluate(()=>{showBrowse(data.find(x=>x.welcome));showEditor(0)});await B.waitForTimeout(700);
  await B.click('#pstyle');await B.waitForSelector('#psheet:not(.hidden)');
  ok(await B.evaluate(()=>document.querySelectorAll('#pcols .sw').length===10&&!!$('#pcpk')&&!!$('#pcols [data-c="#ffffff"]')),'paper colors: 10 colors (with bright white, warm white and black) + any color');
  await B.click('#pcols [data-c="#000000"]');await B.waitForTimeout(500);
  ok(await B.evaluate(()=>cur.ps[0].c==='#000000'&&$('#pcn').textContent==='Black'&&color==='#ffffff'&&getComputedStyle($('#paper')).backgroundColor==='rgb(0, 0, 0)'),'black page: the page turns black and the pen turns white');
  await B.click('#pcols [data-c="#faf1d7"]');await B.waitForTimeout(500);
  ok(await B.evaluate(()=>cur.ps[0].c==='#faf1d7'&&/Warm white/.test($('#pcn').textContent)&&color==='#1d1d1b'),'warm white page ("easier on the eyes"); the pen goes back to black');
  await B.evaluate(()=>{const k=$('#pcpk');k.value='#ffe0b2';k.dispatchEvent(new Event('change'))});await B.waitForTimeout(500);
  ok(await B.evaluate(()=>cur.ps[0].c==='#ffe0b2'&&$('#pcn').textContent==='Your color'&&$('#pcpk').getAttribute('aria-pressed')==='true'),'any color from the color picker');
  await B.click('#psx');await B.evaluate(()=>{$('#ed').classList.add('hidden');showBrowse()});await B.click('#bclose');await B.waitForTimeout(400);

  // ---- PDF import: the first page is the cover, the rest are pages
  const P=await user('pdf@example.com',{demo:'pro'});
  const mk=await b.newPage();
  await mk.setContent('<style>@page{size:600px 800px;margin:0}body{margin:0}div{width:600px;height:800px;page-break-after:always}</style><div style="background:#d33"></div><div style="background:#3a3"></div><div style="background:#33d"></div><div style="background:#dd3"></div>');
  const pdfPath=path.join(require('os').tmpdir(),'u6-test.pdf');fs.writeFileSync(pdfPath,await mk.pdf({width:'600px',height:'800px',printBackground:true}));await mk.close();
  await P.setInputFiles('#pdff',pdfPath);await P.waitForSelector('#dlg:not(.hidden)',{timeout:15000});
  ok(/4 pages/.test(await P.evaluate(()=>$('#dsub').textContent))&&/first page becomes the cover/.test(await P.evaluate(()=>$('#dsub').textContent)),'PDF import says: 4 pages, the first becomes the cover');
  await P.click('#dyes');await P.waitForSelector('#bv:not(.hidden)',{timeout:30000});
  const pd=await P.evaluate(async()=>{const px=async u=>{const im=new Image();im.src=u;await im.decode();const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.drawImage(im,im.width/2,im.height/2,1,1,0,0,1,1);return [...x.getImageData(0,0,1,1).data].slice(0,3)};
    return {n:cur.pages.length,cov:await px(cur.cbg),obj:cur.cobjs.length,p1:await px(cur.bg[0]),p3:await px(cur.bg[2])}});
  const red=c=>c[0]>180&&c[1]<90&&c[2]<90,green=c=>c[1]>130&&c[0]<110&&c[2]<110,yellow=c=>c[0]>180&&c[1]>180&&c[2]<110;
  ok(pd.n===3&&red(pd.cov)&&pd.obj===0&&green(pd.p1)&&yellow(pd.p3),'cover photo = PDF page 1 (red, under the drawing), then 3 pages: green … yellow ('+JSON.stringify(pd)+')');
  ok(await P.evaluate(()=>PDF_MAX===500),'PDF limit is 500 pages');
  // Pro: a photo on the cover, under the drawing
  await P.evaluate(()=>showEditor(-1));await P.waitForTimeout(800);
  ok(await P.evaluate(()=>$('#bgimg').classList.contains('on')),'the PDF\'s first page shows as the cover photo in the editor');
  const sh=await b.newPage({viewport:{width:300,height:400}});await sh.setContent('<body style="margin:0;background:#2050d0"></body>');const phPath=path.join(require('os').tmpdir(),'u6-photo.png');await sh.screenshot({path:phPath});await sh.close();
  const [fc]=await Promise.all([P.waitForEvent('filechooser'),P.click('#photo')]);await fc.setFiles(phPath);await P.waitForTimeout(1200);
  const cp=await P.evaluate(async()=>{const im=new Image();im.src=cur.cbg;await im.decode();const c=document.createElement('canvas');c.width=c.height=1;c.getContext('2d').drawImage(im,im.width/2,im.height/2,1,1,0,0,1,1);return [...c.getContext('2d').getImageData(0,0,1,1).data].slice(0,3)});
  ok(cp[2]>180&&cp[0]<80&&!(await P.evaluate(()=>cur.cobjs.length)),'Pro: the photo button on the cover sets the cover photo (blue) – not a loose object ('+cp+')');
  const bx=await P.locator('#cv').boundingBox();await P.mouse.move(bx.x+bx.width*.3,bx.y+bx.height*.5);await P.mouse.down();await P.mouse.move(bx.x+bx.width*.7,bx.y+bx.height*.55,{steps:8});await P.mouse.up();await P.waitForTimeout(1200);
  ok(await P.evaluate(()=>!!cur.cover&&!!cur.cbg&&!!cur.cpv),'you can draw over the cover photo');
  await P.click('#cst');await P.waitForSelector('#cphx:not(.hidden)');await P.click('#cphx');await P.waitForTimeout(800);
  ok(await P.evaluate(()=>!cur.cbg&&!$('#bgimg').classList.contains('on')&&!!cur.cover),'Cover style → Remove photo takes the photo off (the drawing stays)');
  await P.click('#csx');await P.evaluate(()=>{$('#ed').classList.add('hidden');showBrowse()});
  await P.click('#bclose');

  // ---- download my data
  await B.click('#menub');await B.click('#accb');await B.waitForSelector('.acc-legal');
  const [dd]=await Promise.all([B.waitForEvent('download'),B.click('.acc-legal >> text=Download my data')]);
  const my=JSON.parse(fs.readFileSync(await dd.path(),'utf8'));
  ok(/^foliet-my-data-\d{4}-\d\d-\d\d\.json$/.test(dd.suggestedFilename())&&my.account.email==='bob@example.com'&&my.profile&&my.profile.email==='bob@example.com'&&my.survey&&my.survey.src==='youtube'&&my.templates&&my.templates.t.includes('habit')&&Array.isArray(my.notebooks)&&my.notebooks.length>=3,'"Download my data": account, profile, survey answer, templates and notebooks in one .json');
  await B.click('#acc-x').catch(()=>{});

  // ---- delete my account
  const X=await user('leaving@example.com');
  await X.click('#menub');await X.click('#mfb');await X.fill('#fbk textarea','Bye, thanks for everything');await X.click('#fbk .btn');await X.waitForSelector('#fbk',{state:'detached'});
  await X.evaluate(()=>ACC.F.setDoc(ACC.F.doc(ACC.db,'act','2020-01_'+ACC.user.uid),{ym:'2020-01',uid:ACC.user.uid,at:ACC.F.serverTimestamp()}));
  await admin('owned/'+X.uid,{fields:{t:{arrayValue:{values:[{stringValue:'recipe'}]}},last:{stringValue:'admin'}}});
  await admin('users/'+X.uid+'/r/idx',{fields:{h:{stringValue:'x'},n:{integerValue:'1'},i:{integerValue:'0'},d:{stringValue:'[]'}}});
  await admin('users/'+X.uid,{fields:{v:{integerValue:'1'}}});
  const before=await Promise.all(['profiles','survey','owned','users'].map(c=>getDoc(c+'/'+X.uid)));
  ok(before.every(Boolean),'before: profile, survey, templates and cloud copy exist');
  await X.click('#menub');await X.click('#accb');await X.click('.acc-legal >> text=Delete my account');await X.waitForSelector('#del-pw');
  await X.fill('#del-pw','wrong-password');await X.click('#lockc .btn.danger');await X.waitForTimeout(1200);
  ok(await X.evaluate(()=>!!ACC.user&&/Wrong/.test($('#lockc .lk-err').textContent)),'a wrong password deletes nothing');
  await X.fill('#del-pw','secret123');await X.click('#lockc .btn.danger');
  await X.waitForFunction(()=>!ACC.user&&ACC.gate,null,{timeout:20000}).catch(()=>{});
  ok(await X.evaluate(()=>!ACC.user&&ACC.gate),'after deleting, the app is back on the sign-in screen');
  const after=await Promise.all(['profiles/'+X.uid,'survey/'+X.uid,'owned/'+X.uid,'users/'+X.uid,'users/'+X.uid+'/r/idx'].map(getDoc));
  ok(after.every(x=>!x),'profile, survey, templates and the cloud copy are gone');
  const leftFb=(await listDocs('feedback')).filter(d=>d.fields.uid.stringValue===X.uid).length,leftAct=(await listDocs('act')).filter(d=>d.fields.uid.stringValue===X.uid).length;
  ok(leftFb===0&&leftAct===0,'their feedback and monthly activity are gone too');
  ok(await X.evaluate(async()=>{const r=await new Promise(res=>{const req=indexedDB.open('sketchbook');req.onsuccess=()=>{const t=req.result.transaction('kv').objectStore('kv').getAllKeys();t.onsuccess=()=>res(t.result)}});return !r.some(k=>String(k).startsWith('v2:'))}),'their notebooks were removed from this device');
  await X.waitForSelector('#a-em');await X.fill('#a-em','leaving@example.com');await X.fill('#a-pw','secret123');await X.click('#acc-body button[type=submit]');await X.waitForTimeout(2000);
  ok(await X.evaluate(()=>!ACC.user&&/no account|Wrong/i.test($('#acc-body').textContent)),'the account can\'t sign in any more');

  for(const p of [A,B,C,P,X])p.errs.forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
