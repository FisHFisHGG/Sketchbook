// Promo codes, admin panel, locked notebooks, new-page styles, welcome notebook.
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node features-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','app'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
// the one-time "How did you find Foliet?" question appears after a new account; answer it so the test can go on
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
(async()=>{
  require('http').createServer((q,res)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!f.startsWith('/app/')){res.writeHead(404);return res.end()}
    f=path.join(ROOT,f.slice(4));if(f.endsWith(path.sep)||f===ROOT)f=path.join(f,'index.html');
    if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))}else{res.writeHead(404);res.end('nf')}}).listen(5178,'127.0.0.1');
  const b=await chromium.launch();
  const user=async(em,opts={})=>{
    const ctx=await b.newContext({viewport:{width:1100,height:820}});
    await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});
    await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
    const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(em+': '+e.message));
    await p.goto('http://127.0.0.1:5178/app/?emu=127.0.0.1');await p.waitForSelector('#a-em',{timeout:15000});
    await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');
    await p.waitForFunction(()=>ACC.libUid&&!ACC.gate,null,{timeout:20000});
    if(!opts.skipSurvey)await answerSurvey(p);await p.waitForTimeout(500);
    p.uid=await p.evaluate(()=>ACC.user.uid);return p;
  };
  const plan=p=>p.evaluate(()=>document.querySelector('#plan').textContent);
  // ---- welcome notebook
  const A=await user('owner@example.com');
  ok(await A.evaluate(()=>data.length===1&&data[0].welcome===1&&data[0].pages.length===6),'new account starts with the 6-page welcome notebook');
  ok(await A.evaluate(()=>ownBooks())===0,'welcome notebook doesn\'t count toward the free limit');
  // ---- menu and theme
  await A.click('#menub');
  ok(await A.evaluate(()=>!$('#menu').classList.contains('hidden')&&/owner@example\.com/.test($('#mhead').textContent)&&/Free plan/.test($('#mhead').textContent)),'menu opens and shows the account and plan');
  await A.mouse.click(5,700);await A.waitForTimeout(200);
  ok(await A.evaluate(()=>$('#menu').classList.contains('hidden')),'tapping outside closes the menu');
  const dark0=await A.evaluate(()=>isDark());
  await A.click('#themeb');await A.waitForTimeout(200);
  ok(await A.evaluate(d=>isDark()!==d&&document.documentElement.getAttribute('data-theme')===(d?'light':'dark'),dark0),'sun/moon button switches the theme');
  await A.reload();await A.waitForFunction(()=>ACC.libUid&&!ACC.gate,null,{timeout:20000});
  ok(await A.evaluate(d=>isDark()!==d,dark0),'the chosen theme stays after reopening the app');
  await A.click('#menub');await A.click('#mtheme [data-v="auto"]');
  ok(await A.evaluate(d=>SET.theme==='auto'&&isDark()===d&&!document.documentElement.hasAttribute('data-theme'),dark0),'menu → Theme → Auto follows the device again');
  await A.click('#menub');
  // ---- admin panel + codes
  await admin('admins/'+A.uid,{fields:{note:{stringValue:'test'}}});
  await A.evaluate(()=>checkAdmin(ACC.user));await A.waitForTimeout(500);
  await A.click('#menub');await A.waitForSelector('#madm:not(.hidden)');
  ok(true,'admin sees "Admin panel" in the menu');
  await A.click('#madm');await A.waitForSelector('.astats',{timeout:15000});
  const card=(p,label)=>p.evaluate(l=>{const c=[...document.querySelectorAll('#adm-body .acard')].find(x=>x.querySelector('span').textContent===l);return c?c.querySelector('b').textContent:null},label);
  ok(await card(A,'Accounts in total')==='1','admin overview counts accounts (1)');
  await A.fill('.aform input[placeholder="CODE"]','TEST-30');await A.selectOption('#adm-days','30');await A.fill('#adm-max','2');
  await A.click('text=Create code');await A.waitForSelector('text=TEST-30',{timeout:10000});
  ok(await (await admin('codes/TEST-30',null,'GET')).json().then(j=>j.fields.days.integerValue==='30'&&j.fields.max.integerValue==='2'),'admin creates a code: Pro for 30 days, 2 people');
  await A.click('#adm-x');
  // ---- redeem
  const B=await user('bob@example.com');
  ok(await plan(B)==='Free plan','new user is on the free plan');
  const redeem=async(p,code)=>{if(await p.evaluate(()=>$('#acct').classList.contains('hidden'))){await p.click('#menub');await p.click('#accb')}await p.waitForSelector('#a-code');await p.fill('#a-code',code);await p.click('.codebox button');await p.waitForTimeout(1500);const m=await p.evaluate(()=>{const e=document.querySelector('.cmsg');return e?e.textContent:''});return m};
  let m=await redeem(B,'nope-0000');ok(/doesn’t exist/.test(m),'unknown code is refused ('+m+')');
  m=await redeem(B,'test-30');
  await B.waitForFunction(()=>ACC.pro,null,{timeout:10000}).catch(()=>{});
  ok(await B.evaluate(()=>ACC.pro)&&(await plan(B))==='Pro','code TEST-30 (typed in lower case) turns Pro on');
  ok(await B.evaluate(()=>{const u=proUntil(ACC.proDoc);return u&&Math.abs(u-Date.now()-30*864e5)<36e5}),'Pro from the code lasts 30 days');
  await B.click('#acc-x').catch(()=>{});
  // ---- the rules stop tricks
  const tryWrite=(p,fn)=>p.evaluate(fn).catch(e=>'ERR '+e.message);
  const r1=await tryWrite(B,async()=>{const F=ACC.F;try{await F.setDoc(F.doc(ACC.db,'pro',ACC.user.uid),{by:'admin',since:F.serverTimestamp(),days:0});return 'written!'}catch(e){return e.code}});
  ok(r1==='permission-denied','a user can\'t give themselves Pro forever ('+r1+')');
  const C=await user('carol@example.com');
  const r2=await tryWrite(C,async()=>{const F=ACC.F,db=ACC.db,u=ACC.user.uid;try{await F.runTransaction(db,async tx=>{const c=(await tx.get(F.doc(db,'codes','TEST-30'))).data();tx.update(F.doc(db,'codes','TEST-30'),{used:c.used+1});tx.set(F.doc(db,'redeem',u+'_TEST-30'),{uid:u,code:'TEST-30',at:F.serverTimestamp()});tx.set(F.doc(db,'pro',u),{code:'TEST-30',by:'code',since:F.serverTimestamp(),days:3650})});return 'written!'}catch(e){return e.code}});
  ok(r2==='permission-denied','redeeming with more days than the code gives is refused ('+r2+')');
  const r3=await tryWrite(C,async()=>{const F=ACC.F;try{await F.getDocs(F.collection(ACC.db,'codes'));return 'listed!'}catch(e){return e.code}});
  ok(r3==='permission-denied','users can\'t list the codes ('+r3+')');
  const r4=await tryWrite(C,async()=>{const F=ACC.F;try{await F.getDocs(F.collection(ACC.db,'profiles'));return 'listed!'}catch(e){return e.code}});
  ok(r4==='permission-denied','users can\'t see other accounts ('+r4+')');
  m=await redeem(C,'TEST-30');await C.waitForFunction(()=>ACC.pro,null,{timeout:10000}).catch(()=>{});
  ok(await C.evaluate(()=>ACC.pro),'second person redeems the code (2 of 2)');
  await C.click('#acc-x').catch(()=>{});
  const D=await user('dan@example.com');
  m=await redeem(D,'TEST-30');ok(/used up|expired/.test(m),'third person: code is used up ('+m+')');
  await D.click('#acc-x').catch(()=>{});
  // ---- admin gives Pro by email; expired Pro
  await A.click('#menub');await A.click('#madm');await A.waitForSelector('.astats',{timeout:15000});
  await A.fill('#adm-pf input[type=email]','dan@example.com');await A.selectOption('#adm-pf select','365');await A.click('text=Give Pro');
  await D.waitForFunction(()=>ACC.pro,null,{timeout:15000}).catch(()=>{});
  ok(await D.evaluate(()=>ACC.pro),'admin gives Pro to dan@example.com by email → it turns on for Dan right away');
  await A.waitForFunction(()=>{const l=document.querySelector('#adm-pro');return l&&/dan@example\.com/.test(l.textContent)},null,{timeout:15000});
  const proRows=await A.evaluate(()=>document.querySelectorAll('#adm-pro .arow').length);
  ok(proRows===3,'admin sees the 3 Pro members ('+proRows+')');
  const old=new Date(Date.now()-3*864e5).toISOString();
  await admin('pro/'+D.uid,{fields:{by:{stringValue:'admin'},since:{timestampValue:old},days:{integerValue:'1'}}});
  await D.waitForFunction(()=>!ACC.pro,null,{timeout:10000}).catch(()=>{});
  ok(await D.evaluate(()=>!ACC.pro)&&(await plan(D))==='Free plan','Pro that has ended turns itself off');
  // ---- admin statistics: periods, money (Stripe data), activity, breakdowns, search, CSV
  const nowS=Math.floor(Date.now()/1000),lastYear=Math.floor(new Date(new Date().getFullYear()-1,5,15).getTime()/1000);
  const pay=(id,amt,created)=>admin('customers/'+B.uid+'/payments/'+id,{fields:{status:{stringValue:'succeeded'},amount:{integerValue:String(amt)},amount_received:{integerValue:String(amt)},currency:{stringValue:'eur'},created:{integerValue:String(created)}}});
  await pay('pi_1',2999,nowS);await pay('pi_2',2999,lastYear);await pay('pi_3',399,nowS);
  await admin('customers/'+B.uid+'/subscriptions/sub_1',{fields:{status:{stringValue:'active'},created:{timestampValue:new Date().toISOString()},items:{arrayValue:{values:[{mapValue:{fields:{price:{mapValue:{fields:{unit_amount:{integerValue:'2999'},recurring:{mapValue:{fields:{interval:{stringValue:'year'}}}}}}}}}}]}}}});
  await admin('customers/'+C.uid+'/subscriptions/sub_2',{fields:{status:{stringValue:'active'},created:{timestampValue:new Date().toISOString()},items:{arrayValue:{values:[{mapValue:{fields:{price:{mapValue:{fields:{unit_amount:{integerValue:'399'},recurring:{mapValue:{fields:{interval:{stringValue:'month'}}}}}}}}}}]}}}});
  await A.click('#adm-r');await A.waitForSelector('#adm-body .aper',{timeout:15000});
  ok(await card(A,'Revenue')==='€63.97'&&await card(A,'Payments')==='3','All time: revenue €63.97 from 3 payments');
  ok(await card(A,'Active subscriptions')==='2'&&await card(A,'Monthly recurring (est.)')==='€6.49','subscriptions: 2 active, about €6.49 a month');
  ok(await card(A,'Pro right now')==='2','Pro right now: Bob and Carol, each counted once (code + subscription); Dan\'s Pro has ended');
  await A.click('#adm-body .aper >> text=This year');await A.waitForTimeout(200);
  ok(await card(A,'Revenue')==='€33.98'&&await card(A,'Payments')==='2','This year: last year\'s payment is left out (€33.98)');
  const ly='y'+(new Date().getFullYear()-1);await A.selectOption('#adm-body .aper select',ly);await A.waitForTimeout(200);
  ok(await card(A,'Revenue')==='€29.99'&&await card(A,'New accounts')==='0','a past year from the list: €29.99, no new accounts then');
  await A.click('#adm-body .aper >> text=This month');await A.waitForTimeout(200);
  ok(await card(A,'New accounts')==='4'&&await card(A,'Active accounts')==='4','This month: 4 new accounts, 4 active');
  ok(await A.evaluate(()=>[...document.querySelectorAll('.achart')].length===2&&document.querySelectorAll('.achart .cbar').length>=56),'charts: new accounts and revenue, day by day for the month');
  ok(await A.evaluate(()=>/Email and password/.test(document.querySelector('.abrks').textContent)&&/Device/.test(document.querySelector('.abrks').textContent)),'breakdowns: sign-in method, device, installed app, language');
  await A.fill('#adm-body input[type=search]','carol');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>{const r=document.querySelectorAll('#adm-acc .arow');return r.length===1&&/carol@example\.com/.test(r[0].textContent)}),'search finds an account by email');
  const [dl]=await Promise.all([A.waitForEvent('download'),A.click('text=Download all (CSV)')]);
  const csv=fs.readFileSync(await dl.path(),'utf8').trim().split(/\r?\n/);
  ok(dl.suggestedFilename().endsWith('.csv')&&csv.length===5&&/found_via/.test(csv[0])&&csv.slice(1).every(r=>/YouTube/.test(r))&&/"email","name","joined"/.test(csv[0])&&csv.slice(1).every(r=>/@example\.com/.test(r)),'CSV download: header + 4 accounts ('+dl.suggestedFilename()+', '+csv.length+' lines)');
  const r5=await tryWrite(C,async()=>{const F=ACC.F;try{await F.getDocs(F.collectionGroup(ACC.db,'payments'));return 'read!'}catch(e){return e.code}});
  ok(r5==='permission-denied','users can\'t see payments ('+r5+')');
  // ---- "How did you find Foliet?": mandatory, can't be closed, "Somewhere else" needs words; answers in the admin panel
  const E=await user('eve@example.com',{skipSurvey:true});
  await E.waitForSelector('#srv',{timeout:8000});
  ok(true,'a new account is asked "How did you find Foliet?"');
  ok(await E.evaluate(()=>!document.querySelector('#srv [aria-label="Close"]')&&document.querySelector('#srv .btn').disabled),'no close button, Continue is off until something is chosen');
  await E.keyboard.press('Escape');await E.mouse.click(5,5);await E.waitForTimeout(300);
  ok(await E.evaluate(()=>!!document.querySelector('#srv')),'Escape and tapping outside don\'t close it');
  await E.click('#srv .srv-opt[data-v="other"]');
  ok(await E.evaluate(()=>document.querySelector('#srv .btn').disabled&&!document.querySelector('.srv-o').classList.contains('hidden')),'"Somewhere else" shows a box that must be filled in');
  const r6=await tryWrite(E,async()=>{const F=ACC.F;try{await F.setDoc(F.doc(ACC.db,'survey',ACC.user.uid),{src:'other',other:'',at:F.serverTimestamp()});return 'saved!'}catch(e){return e.code}});
  ok(r6==='permission-denied','the rules also refuse "Somewhere else" without words ('+r6+')');
  await E.fill('#srv-other','A friend at school');await E.click('#srv .btn');await E.waitForSelector('#srv',{state:'detached'});
  ok(await E.evaluate(()=>localStorage.getItem('sb-src:'+ACC.user.uid))==='1','answer saved, the window goes away');
  await E.reload();await E.waitForFunction(()=>ACC.libUid&&!ACC.gate,null,{timeout:20000});await E.waitForTimeout(2500);
  ok(await E.evaluate(()=>!document.querySelector('#srv')),'it isn\'t asked again');
  await A.click('#adm-r');await A.waitForSelector('#adm-body .aper',{timeout:15000});await A.click('#adm-body .aper >> text=All time');await A.waitForTimeout(200);
  const sv=await A.evaluate(()=>{const h=[...document.querySelectorAll('#adm-body h3')].find(x=>x.textContent==='How people found Foliet');const box=h.nextElementSibling;return box.textContent});
  ok(/5 answers/.test(sv)&&/YouTube4 · 80%/.test(sv)&&/A friend at school/.test(sv)&&/eve@example\.com/.test(sv),'admin: 5 answers, YouTube 80%, and Eve\'s own words with her email');
  await A.selectOption('#adm-body .aper select',ly);await A.waitForTimeout(200);
  ok(await A.evaluate(()=>/0 answers/.test([...document.querySelectorAll('#adm-body h3')].find(x=>x.textContent==='How people found Foliet').nextElementSibling.textContent)),'a past year: no answers then');
  await A.click('#adm-body .aper >> text=All time');await A.waitForTimeout(200);
  // ---- locked notebooks
  await A.click('#adm-x');
  await A.click('.cell:not(.add)');await A.waitForTimeout(800);
  await A.click('#block');await A.waitForSelector('#lockd:not(.hidden)');
  const pins=await A.$$('#lockc .lk-in');await pins[0].fill('1234');await pins[1].fill('1234');await A.click('text=Lock notebook');
  await A.waitForFunction(()=>cur.lock&&cur.lock.t==='pin',null,{timeout:10000});
  ok(true,'notebook locked with PIN 1234');
  await A.click('#bclose');await A.waitForTimeout(500);
  ok(await A.evaluate(()=>!!document.querySelector('.cell .lkb')),'the shelf shows a padlock on it');
  await A.click('.cell:not(.add)');await A.waitForSelector('#lk-open');
  await A.fill('#lk-open','9999');await A.waitForTimeout(1200);
  ok(/Wrong PIN/.test(await A.evaluate(()=>document.querySelector('.lk-err').textContent))&&await A.evaluate(()=>$('#bv').classList.contains('hidden')),'wrong PIN: stays closed');
  await A.fill('#lk-open','1234');await A.waitForTimeout(1200);
  ok(await A.evaluate(()=>!$('#bv').classList.contains('hidden')),'right PIN opens it');
  await A.click('#bclose');await A.waitForTimeout(400);
  await A.fill('#q','Sticky notes');await A.waitForTimeout(500);
  ok(await A.evaluate(()=>!document.querySelector('.cell:not(.add)')),'a locked notebook\'s pages are not searchable');
  await A.fill('#q','');await A.waitForTimeout(500);
  // forgot the PIN → account password removes the lock
  await A.click('.cell:not(.add)');await A.waitForSelector('#lk-open');
  await A.click('text=Forgot the PIN?');await A.waitForSelector('#lk-acct');await A.fill('#lk-acct','secret123');await A.click('#lockc .acts2 .btn');
  await A.waitForFunction(()=>!$('#bv').classList.contains('hidden'),null,{timeout:10000}).catch(()=>{});
  ok(await A.evaluate(()=>!cur.lock&&!$('#bv').classList.contains('hidden')),'"Forgot the PIN?" + account password removes the lock and opens it');
  // ---- new pages with a chosen style
  const n0=await A.evaluate(()=>cur.pages.length);
  await A.click('#badd');await A.waitForSelector('#npd:not(.hidden)');await A.click('#npats [data-p="grid"]');await A.click('#npyes');await A.waitForTimeout(800);
  ok(await A.evaluate(n0=>cur.pages.length>n0&&cur.ps.slice(n0).every(s=>s&&s.p==='grid'),n0),'"New pages" → Grid: the new pages are grid pages');
  for(const p of [A,B,C,D])p.errs.forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
