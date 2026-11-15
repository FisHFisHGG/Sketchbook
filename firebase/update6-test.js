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
  await B.click('#tpl .tcardx[data-t="cornell"]');await B.waitForSelector('#bv:not(.hidden)',{timeout:10000});
  ok(await B.evaluate(()=>cur.title==='Cornell notes'&&cur.pages.length===8&&cur.design==='frame'&&cur.bg.filter(Boolean).length===8),'a free template makes a notebook right away (Cornell notes, 8 pages, cover design)');
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
  ok(await A.evaluate(()=>/Template: Habit tracker/.test($('#adm-codes').textContent)),'the code list says which template it gives');
  // Bob redeems it from the buy window
  await B.click('#tpl .tcardx[data-t="habit"]');await B.waitForSelector('#t-code');await B.fill('#t-code','habit-1');await B.click('#lockc .codebox button');
  await B.waitForFunction(()=>ACC.owned.has('habit'),null,{timeout:10000}).catch(()=>{});
  ok(await B.evaluate(()=>ACC.owned.has('habit')&&$('#lockd').classList.contains('hidden')),'Bob types the code (lower case) → Habit tracker is his');
  await B.waitForTimeout(400);
  ok(await B.evaluate(()=>{const c=document.querySelector('#tpl .tcardx[data-t="habit"]');return c&&!c.classList.contains('lock')&&/Yours/.test(c.querySelector('.tprice').textContent)}),'the store shows it as "✓ Yours"');
  const ow=await getDoc('owned/'+B.uid);
  ok(ow&&ow.fields.t.arrayValue.values.map(v=>v.stringValue).join()==='habit'&&ow.fields.last.stringValue==='HABIT-1'&&(await getDoc('codes/HABIT-1')).fields.used.integerValue==='1','saved: owned = [habit], the code is used 1 / 1');
  await B.click('#tpl .tcardx[data-t="habit"]');await B.waitForSelector('#bv:not(.hidden)',{timeout:10000});
  ok(await B.evaluate(()=>cur.title==='Habit tracker'&&cur.pages.length===12&&cur.o==='l'),'he can use it: Habit tracker notebook, 12 landscape pages');
  await B.click('#bclose');await B.waitForTimeout(300);
  await B.reload();await B.waitForFunction(()=>ACC.libUid&&!ACC.gate,null,{timeout:20000});await B.waitForTimeout(800);
  ok(await B.evaluate(()=>ACC.owned.has('habit')&&JSON.parse(localStorage.getItem('sb-own:'+ACC.user.uid)).includes('habit')),'after reopening the app it\'s still his (also kept on the device for offline)');
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
  await A.fill('#adm-tf input[type=email]','carol@example.com');await A.selectOption('#adm-tf select','all');await A.click('#adm-tf >> text=Give template');
  await C.waitForFunction(()=>ACC.owned.has('all'),null,{timeout:10000}).catch(()=>{});
  await C.waitForTimeout(400);
  ok(await C.evaluate(()=>ACC.owned.has('all')&&ACC.owned.has('comic')&&!document.querySelector('#tpl .tcardx.lock')),'admin gives Carol all paid templates by email → nothing is locked for her');
  await A.waitForSelector('#adm-tf',{timeout:15000});await A.waitForTimeout(300);
  const card=(p,label)=>p.evaluate(l=>{const c=[...document.querySelectorAll('#adm-body .acard')].find(x=>x.querySelector('span').textContent===l);return c?c.querySelector('b').textContent:null},label);
  ok(await card(A,'People with paid templates')==='2'&&await card(A,'Have all paid templates')==='1'&&await card(A,'Templates unlocked')==='2','admin: 2 people with paid templates, 1 has all, 2 unlocked one by one');
  const [dl]=await Promise.all([A.waitForEvent('download'),A.click('text=Download all (CSV)')]);
  const csv=fs.readFileSync(await dl.path(),'utf8');
  ok(/"templates"/.test(csv)&&/Habit tracker/.test(csv)&&/All paid templates/.test(csv),'the CSV has a templates column');
  await A.click('#adm-x');

  // ---- cover designs
  await B.evaluate(()=>{showBrowse(data.find(x=>x.title==='Cornell notes'));showEditor(-1)});await B.waitForTimeout(600);
  await B.click('#cst');await B.waitForSelector('#csheet:not(.hidden)');
  ok(await B.evaluate(()=>document.querySelectorAll('#cdes button').length===13),'cover style has 13 designs (None + 12)');
  await B.click('#cdes [data-k="waves"]');await B.waitForTimeout(200);
  ok(await B.evaluate(()=>cur.design==='waves'&&/svg/.test($('#paper').style.backgroundImage)),'choosing "Waves" paints it on the cover');
  await B.click('#cdes [data-k=""]');await B.waitForTimeout(100);
  ok(await B.evaluate(()=>!cur.design),'"None" takes the design off');
  await B.click('#cdes [data-k="stars"]');await B.click('#csx');
  await B.evaluate(()=>{$('#ed').classList.add('hidden');showBrowse()});await B.click('#bclose');await B.waitForTimeout(500);
  ok(await B.evaluate(()=>{const c=[...document.querySelectorAll('.cell:not(.add)')].find(x=>/Cornell notes/.test(x.textContent));return c&&/svg/.test(c.querySelector('.front').style.getPropertyValue('--ct'))}),'the shelf shows the cover with its design');

  // ---- PDF import: the first page is the cover, the rest are pages
  const P=await user('pdf@example.com',{demo:'pro'});
  const mk=await b.newPage();
  await mk.setContent('<style>@page{size:600px 800px;margin:0}body{margin:0}div{width:600px;height:800px;page-break-after:always}</style><div style="background:#d33"></div><div style="background:#3a3"></div><div style="background:#33d"></div><div style="background:#dd3"></div>');
  const pdfPath=path.join(require('os').tmpdir(),'u6-test.pdf');fs.writeFileSync(pdfPath,await mk.pdf({width:'600px',height:'800px',printBackground:true}));await mk.close();
  await P.setInputFiles('#pdff',pdfPath);await P.waitForSelector('#dlg:not(.hidden)',{timeout:15000});
  ok(/4 pages/.test(await P.evaluate(()=>$('#dsub').textContent))&&/first page becomes the cover/.test(await P.evaluate(()=>$('#dsub').textContent)),'PDF import says: 4 pages, the first becomes the cover');
  await P.click('#dyes');await P.waitForSelector('#bv:not(.hidden)',{timeout:30000});
  const pd=await P.evaluate(async()=>{const px=async u=>{const im=new Image();im.src=u;await im.decode();const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.drawImage(im,im.width/2,im.height/2,1,1,0,0,1,1);return [...x.getImageData(0,0,1,1).data].slice(0,3)};
    return {n:cur.pages.length,cov:await px(cur.cobjs[0].src),p1:await px(cur.bg[0]),p3:await px(cur.bg[2])}});
  const red=c=>c[0]>180&&c[1]<90&&c[2]<90,green=c=>c[1]>130&&c[0]<110&&c[2]<110,yellow=c=>c[0]>180&&c[1]>180&&c[2]<110;
  ok(pd.n===3&&red(pd.cov)&&green(pd.p1)&&yellow(pd.p3),'cover = PDF page 1 (red), then 3 pages: green … yellow ('+JSON.stringify(pd)+')');
  ok(await P.evaluate(()=>PDF_MAX===500),'PDF limit is 500 pages');
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
