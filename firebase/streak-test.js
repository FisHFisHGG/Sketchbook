// The streak: days in a row you open Foliet, freezes (1, 2 after 100 days; back 2 days after use; extra ones), the rewards
// (100 days: a cover, a template, a label and a sticker pack you can't buy; then 150, 200, 250, 300, 365, 500, 777 – a
// Christian gift –, 1,000; then a gold medal every 500 days from 1,500; nothing from the Store for free), the rules that guard
// all of it, the Store's Streak tab, the admin giving freezes, offline days, GDPR.
// Also: every paid Store item is €1.99.
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node streak-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SITE=path.join(__dirname,'..'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.json':'application/json'};
const SHOTS=process.env.SHOTS||'';
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
const I=v=>({integerValue:String(v)});
const today=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);
(async()=>{
  require('http').createServer((q,res)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!u.startsWith('/Sketchbook/')){res.writeHead(404);return res.end()}
    let f=path.join(SITE,u.slice('/Sketchbook/'.length));if(u.endsWith('/'))f=path.join(f,'index.html');
    if(f.startsWith(SITE)&&!/^(firebase|\.git)\b|CLAUDE/.test(path.relative(SITE,f))&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});return res.end(fs.readFileSync(f))}
    res.writeHead(404,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(SITE,'404.html')))}).listen(5197,'127.0.0.1');
  const b=await chromium.launch();
  const URL0='http://127.0.0.1:5197/Sketchbook/app/?emu=127.0.0.1';
  const ctxOf=async(o={})=>{const ctx=await b.newContext({viewport:{width:1100,height:850},...o});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}
    // every message shown at the bottom (they go away after 3 seconds)
    document.addEventListener('DOMContentLoaded',()=>{const e=document.getElementById('sv');window._toasts=[];if(e)new MutationObserver(()=>{if(e.textContent)window._toasts.push(e.textContent)}).observe(e,{childList:true,characterData:true,subtree:true})})});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());return ctx};
  const open=async(ctx,name)=>{const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(name+': '+e.message));await p.goto(URL0);return p};
  const ready=p=>p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length&&$('#boot').classList.contains('hidden'),null,{timeout:30000});
  const signUp=async(p,em)=>{await p.waitForSelector('#a-em',{timeout:15000});await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');await ready(p);await answerSurvey(p);await p.waitForTimeout(500)};
  const giveAdmin=async p=>{const id=await p.evaluate(()=>ACC.user.uid);await admin('admins/'+id,{fields:{note:{stringValue:'t'}}});await p.evaluate(()=>checkAdmin(ACC.user));await p.waitForTimeout(400)};
  const shot=async(p,n)=>{if(SHOTS)await p.screenshot({path:path.join(SHOTS,n+'.png')})};
  // the streak in the cloud (admin rights: no rules), and setting it to a day in the past
  const getStk=async uid=>{const r=await (await admin('streak/'+uid,null,'GET')).json();if(!r.fields)return null;const o={};for(const [k,v] of Object.entries(r.fields))o[k]=v.integerValue!=null?+v.integerValue:v.arrayValue?(v.arrayValue.values||[]).map(x=>+x.integerValue):v;return o};
  const setStk=(uid,o)=>admin('streak/'+uid,{fields:{n:I(o.n),best:I(o.best||o.n),d:I(o.d),s:I(o.s!=null?o.s:o.d-o.n+1),f:I(o.f!=null?o.f:1),fr:I(o.fr||0),b:I(o.b||0),fz:{arrayValue:{values:(o.fz||[]).map(I)}},at:{timestampValue:new Date().toISOString()},v:I(1)}});
  const getOwned=async uid=>{const r=await (await admin('owned/'+uid,null,'GET')).json();return r.fields?{t:(r.fields.t.arrayValue.values||[]).map(v=>v.stringValue),last:r.fields.last.stringValue}:null};
  // a fresh start of the app on this device (another day's first visit: what the device remembers about messages is cleared)
  const restart=async p=>{await p.evaluate(()=>{localStorage.removeItem('sb-stk:'+ACC.user.uid)});await p.reload();await ready(p);await p.waitForFunction(()=>!STRK.busy&&STRK.st,null,{timeout:20000});await p.waitForTimeout(300)};
  const toastTxt=p=>p.waitForFunction(()=>_toasts.length,null,{timeout:10000}).then(()=>p.evaluate(()=>_toasts.join(' | '))).catch(()=>'');
  const T=today();

  // ======== 1) day 1
  const CA=await ctxOf(),A=await open(CA,'A');await signUp(A,'fire@example.com');
  await A.waitForFunction(()=>STRK.st&&!STRK.busy,null,{timeout:20000});
  const uid=await A.evaluate(()=>ACC.user.uid);
  let st=await getStk(uid);
  ok(st&&st.n===1&&st.best===1&&st.d===T&&st.s===T&&st.f===1&&st.b===0&&st.g===undefined,'a new account starts a streak: day 1 in the cloud (streak/{uid}) '+JSON.stringify(st&&{n:st.n,d:st.d-T,f:st.f}));
  ok(await A.evaluate(()=>!$('#stkb').classList.contains('hidden')&&$('#stkn').textContent==='1'&&!$('#stkb').classList.contains('cold')),'the flame on the shelf says 1');
  await A.waitForFunction(()=>_toasts.some(t=>/Day 1 of your streak/.test(t)),null,{timeout:10000}).catch(()=>{});
  ok(await A.evaluate(()=>_toasts.some(t=>/Day 1 of your streak/.test(t))),'a message: “Day 1 of your streak. Come back tomorrow…”');
  await A.click('#stkb');await A.waitForSelector('#lockc.stkdlg .stk-num');
  ok(await A.evaluate(()=>{const c=$('#lockc');return c.querySelector('.stk-num').textContent==='1'&&/day in a row/.test(c.textContent)&&c.querySelectorAll('.stk-day').length===7
    &&c.querySelector('.stk-day.today.on')&&c.querySelectorAll('.stk-slot.on').length===1&&/Ready/.test(c.querySelector('.stk-slots').textContent)
    &&/Your first rewards at 100 days/.test(c.textContent)&&/99 days to go/.test(c.textContent)&&c.querySelectorAll('.stk-r').length===10
    &&/Golden flame, Year in pixels, Laurel, Milestones/.test(c.textContent)&&/A gold medal every 500 days, for ever/.test(c.textContent)&&/Calvary, Prayer journal/.test(c.textContent)&&!/any item from the Store/.test(c.textContent)&&/Get 3 more freezes · €1\.99/.test(c.textContent)}),
    'the streak window: 1 day, the last 7 days (today lit), 1 freeze ready, 99 days to the first rewards, the rewards road, more freezes for €1.99');
  await shot(A,'stk-1-day1');
  await A.click('#stk-buy');await A.waitForSelector('#fz-buy');await A.click('#fz-buy');
  ok(await A.evaluate(()=>/3 streak freezes/.test($('#lockc').textContent)&&/Buy for €1\.99/.test($('#fz-buy').textContent)&&/opens soon/.test($('#lockc .cmsg').textContent)),'“Get 3 more freezes”: 3 streak freezes for €1.99 (buying opens with Pro)');
  await A.keyboard.press('Escape');await A.evaluate(()=>{const d=$('#lockd');if(!d.classList.contains('hidden'))d.click()});await A.waitForTimeout(200);

  // ======== 2) the next day, a missed day (a freeze), two missed days (the end), extra freezes
  await setStk(uid,{n:5,d:T-1});await restart(A);st=await getStk(uid);
  ok(st.n===6&&st.d===T&&st.f===1,'the next day: 6 days in a row');
  ok(/6 days in a row! 94 more to your first rewards/.test(await toastTxt(A))&&await A.evaluate(()=>$('#stkn').textContent==='6'),'… “🔥 6 days in a row! 94 more to your first rewards.”');
  await setStk(uid,{n:10,d:T-2,f:1});await restart(A);st=await getStk(uid);
  ok(st.n===11&&st.f===0&&st.fr===T+1&&st.fz.includes(T-1),'a missed day: a freeze keeps the streak (11), it comes back 2 days after the missed day');
  ok(/A streak freeze kept your streak going: 11 days/.test(await toastTxt(A)),'… “❄ A streak freeze kept your streak going”');
  await A.click('#stkb');await A.waitForSelector('#lockc.stkdlg .stk-num');
  ok(await A.evaluate(()=>{const c=$('#lockc'),days=[...c.querySelectorAll('.stk-day')];return days[5].classList.contains('frz')&&days[6].classList.contains('on')&&/Back in 1 day/.test(c.querySelector('.stk-slots').textContent)}),'the window: yesterday frozen ❄, the freeze is back in 1 day');
  await shot(A,'stk-2-frozen');await A.evaluate(()=>$('#lockd').click());
  await setStk(uid,{n:20,d:T-3,f:1});await restart(A);st=await getStk(uid);
  ok(st.n===1&&st.best===20&&st.s===T&&st.f===1,'two missed days with one freeze: the streak ends (best stays 20), the freeze is kept');
  ok(/Your 20-day streak ended/.test(await toastTxt(A)),'… “Your 20-day streak ended. A new one starts today”');
  await setStk(uid,{n:20,best:20,d:T-3,f:1,b:2});await restart(A);st=await getStk(uid);
  ok(st.n===21&&st.b===1&&st.f===1&&st.fz.includes(T-2)&&st.fz.includes(T-1),'with extra freezes: 2 missed days = 1 freeze + 1 extra (21 days); the freeze used 2 days ago is back today');

  // ======== 3) the rules: nobody makes up a streak or rewards
  const deny=(fn,arg)=>A.evaluate(async([f,a])=>{const F=ACC.F,r=F.doc(ACC.db,'streak',ACC.user.uid),o=F.doc(ACC.db,'owned',ACC.user.uid);
    try{await (new Function('F','r','o','a','ACC','return ('+f+')(F,r,o,a,ACC)'))(F,r,o,a,ACC);return 'allowed'}catch(e){return e.code}},[fn.toString(),arg]);
  await setStk(uid,{n:5,d:T-1});
  const base={n:5,best:5,d:T-1,s:T-5,f:1,fr:0,b:0,fz:[],v:1};
  ok(await deny((F,r,o,a)=>F.setDoc(r,{...a,n:7,best:7,d:a.d+1,at:F.serverTimestamp()}),base)==='permission-denied','rules: two days added for one day → refused');
  ok(await deny((F,r,o,a)=>F.setDoc(r,{...a,n:6,best:6,d:a.d+6,at:F.serverTimestamp()}),base)==='permission-denied','rules: a day in the future → refused');
  ok(await deny((F,r,o,a)=>F.setDoc(r,{...a,n:6,best:6,d:a.d+1,b:5,at:F.serverTimestamp()}),base)==='permission-denied','rules: giving yourself extra freezes → refused');
  ok(await deny((F,r,o,a)=>F.setDoc(o,{t:['cov-flame'],last:'streak'}),base)==='permission-denied','rules: the 100-day cover before 100 days → refused');
  ok(await deny((F,r,o,a)=>F.setDoc(o,{t:['cov-galaxy'],last:'gift'}),base)==='permission-denied','rules: a paid Store item for free (an old “gift”) → refused');
  ok(await deny((F,r,o,a)=>F.setDoc(o,{t:['med-1500'],last:'streak'}),base)==='permission-denied','rules: a medal before 1,500 days → refused');
  ok(await deny((F,r,o,a)=>F.setDoc(r,{...a,n:6,best:6,d:a.d+1,at:F.serverTimestamp()}),base)==='allowed','rules: the next day, honestly → allowed');
  await setStk(uid,{n:5,d:T-3,f:1});
  ok(await deny((F,r,o,a)=>F.setDoc(r,{...a,n:6,best:6,d:a.d+3,at:F.serverTimestamp()}),{...base,d:T-3,s:T-7})==='permission-denied','rules: 2 missed days, 1 freeze and no extra → the streak can’t go on');
  await admin('streak/'+uid,null,'DELETE');
  ok(await deny((F,r,o,a)=>F.setDoc(r,{...a,n:50,best:50,d:a.d+1,s:a.d-48,at:F.serverTimestamp()}),base)==='permission-denied','rules: starting a new streak at 50 days → refused');

  // ======== 4) 100 days: the rewards, a second freeze
  await setStk(uid,{n:99,best:99,d:T-1,f:1});await restart(A);
  st=await getStk(uid);ok(st.n===100&&st.best===100&&st.f===2,'day 100: 100 days in a row, and a second freeze, ready');
  await A.waitForSelector('#lockc.cel #stk-collect',{timeout:10000});
  ok(await A.evaluate(()=>{const c=$('#lockc');return /100 days in a row!/.test(c.textContent)&&c.querySelectorAll('.stk-ti').length===4&&/Golden flame/.test(c.textContent)&&/Year in pixels/.test(c.textContent)&&/Laurel/.test(c.textContent)&&/Milestones/.test(c.textContent)}),
    'a celebration: “100 days in a row!” with the 4 rewards');
  await shot(A,'stk-3-100');
  ok(await deny((F,r,o,a)=>F.setDoc(o,{t:['cov-aurora'],last:'streak'}),base)==='permission-denied','rules: the 150-day cover at 100 days → refused');
  await A.click('#stk-collect');await A.waitForFunction(()=>$('#lockd').classList.contains('hidden'),null,{timeout:10000});
  let own=await getOwned(uid);
  ok(own&&['cov-flame','pixels','lbl-laurel','stk-wins'].every(id=>own.t.includes(id))&&own.last==='streak','Collect: the 4 rewards are yours (owned, saved in your account)');
  ok(await A.evaluate(()=>myTpls().some(t=>t.id==='pixels')&&STPK.filter(ownsItem).some(p=>p.id==='stk-wins')&&LABELS.filter(ownsItem).some(l=>l.id==='lbl-laurel')&&COVERS.filter(ownsItem).some(c=>c.id==='cov-flame')),
    '… and ready to use: New notebook (Year in pixels), + → Stickers (Milestones), + → Labels (Laurel), Cover style → Design (Golden flame)');
  ok(await A.evaluate(()=>!$('#stkd').classList.contains('hidden'))===false,'no red dot once collected');
  // the reward template draws, a notebook from it, the cover
  await A.evaluate(async()=>{await useTpl(tplById('pixels'))});await A.waitForTimeout(1200);
  ok(await A.evaluate(()=>cur&&cur.tpl==='pixels'&&cur.design==='flame'&&cur.pages.length===4&&cur.o==='l'),'a notebook made from Year in pixels: 4 landscape pages, the Golden flame cover');
  await shot(A,'stk-4-pixels');
  await A.evaluate(()=>closeBook());await A.waitForTimeout(400);

  // ======== 5) the rarer rewards: 150–365 days together, 777 (a Christian gift), 1,000 and the medals – nothing from the Store
  await setStk(uid,{n:399,best:399,d:T-1,f:2});await restart(A);
  await A.waitForSelector('#lockc.cel #stk-collect',{timeout:10000});
  ok(await A.evaluate(()=>{const c=$('#lockc');return c.querySelectorAll('.stk-ti').length===5&&/365 days in a row!/.test(c.textContent)&&/One whole year/.test(c.textContent)&&/Northern lights/.test(c.textContent)&&/Constellations/.test(c.textContent)&&/One year/.test(c.textContent)}),
    'at 400 days: the rewards for 150, 200, 250, 300 and 365 days, all together (“365 days in a row!”)');
  await shot(A,'stk-5-365');
  await A.click('#stk-collect');await A.waitForFunction(()=>$('#lockd').classList.contains('hidden'),null,{timeout:10000});await A.waitForTimeout(800);
  own=await getOwned(uid);ok(['cov-aurora','gratitude','lbl-seal','cov-constel','stk-year'].every(id=>own.t.includes(id)),'… collected');
  ok(await A.evaluate(()=>$('#lockd').classList.contains('hidden')&&!document.querySelector('.stk-pick')&&STPK.filter(ownsItem).some(p=>p.id==='stk-year')),'no gift from the Store after them; the One year stickers are in + → Stickers');
  await setStk(uid,{n:776,best:776,d:T-1,f:2});await restart(A);
  await A.waitForSelector('#lockc.cel #stk-collect',{timeout:10000});
  ok(await A.evaluate(()=>{const c=$('#lockc');return /777 days in a row!/.test(c.textContent)&&/Galatians 6:9/.test(c.textContent)&&/Calvary/.test(c.textContent)&&/Prayer journal/.test(c.textContent)&&/Rosette/.test(c.textContent)&&c.querySelectorAll('.stk-ti').length===3}),
    '777 days: “777 days in a row!” with Galatians 6:9 – the Calvary cover (three crosses on a hill) and the Prayer journal (and the 500-day Rosette label)');
  await shot(A,'stk-6-777');
  await A.click('#stk-collect');await A.waitForFunction(()=>$('#lockd').classList.contains('hidden'),null,{timeout:10000});
  own=await getOwned(uid);ok(['lbl-rosette','cov-calvary','prayer'].every(id=>own.t.includes(id)),'… collected');
  ok(await A.evaluate(()=>myTpls().some(t=>t.id==='prayer')&&tplById('prayer').g==='faith'&&COVERS.filter(ownsItem).some(c=>c.id==='cov-calvary')),'the Prayer journal is in New notebook (and under Faith), the Calvary cover in Cover style');
  ok(await deny((F,r,o,a)=>F.runTransaction(ACC.db,async tx=>{const t=(await tx.get(o)).data().t;tx.set(o,{t:[...t,'cov-crown'],last:'streak'})}),base)==='permission-denied','rules: the 1,000-day cover at 777 → refused');
  await setStk(uid,{n:1499,best:1499,d:T-1,f:2});await restart(A);
  await A.waitForSelector('#lockc.cel #stk-collect',{timeout:10000});
  ok(await A.evaluate(()=>{const c=$('#lockc');return /1,500 days in a row!/.test(c.textContent)&&/Golden crown/.test(c.textContent)&&/Medal · 1,500 days/.test(c.textContent)}),'1,500 days: the Golden crown (1,000) and the first gold medal');
  await shot(A,'stk-7-1500');
  await A.click('#stk-collect');await A.waitForFunction(()=>$('#lockd').classList.contains('hidden'),null,{timeout:10000});
  own=await getOwned(uid);ok(own.t.includes('cov-crown')&&own.t.includes('med-1500'),'… collected: the medal is its own item (med-1500)');
  ok(await A.evaluate(()=>{const pk=STPK.find(p=>p.id==='stk-medals');return ownsItem(pk)&&pk.items.length===1&&STPK.filter(ownsItem).includes(pk)}),'the Streak medals pack has the 1,500 medal');
  ok(await deny((F,r,o,a)=>F.runTransaction(ACC.db,async tx=>{const t=(await tx.get(o)).data().t;tx.set(o,{t:[...t,'med-2000'],last:'streak'})}),base)==='permission-denied','rules: the 2,000 medal at 1,500 → refused');
  ok(await deny((F,r,o,a)=>F.runTransaction(ACC.db,async tx=>{const t=(await tx.get(o)).data().t;tx.set(o,{t:[...t,'med-1250'],last:'streak'})}),base)==='permission-denied','rules: a medal that doesn’t exist (1,250) → refused');
  await setStk(uid,{n:2001,best:2001,d:T-1,f:2});await restart(A);await A.waitForSelector('#lockc.cel #stk-collect',{timeout:10000});
  await A.click('#stk-collect');await A.waitForFunction(()=>$('#lockd').classList.contains('hidden'),null,{timeout:10000});
  own=await getOwned(uid);ok(own.t.includes('med-2000')&&await A.evaluate(()=>STPK.find(p=>p.id==='stk-medals').items.length===2),'2,000 days: the next medal, 500 days later');

  // ======== 6) the Store: the Streak tab, the rewards in their tabs, €1.99
  await A.click('#storeb');await A.waitForSelector('.skinds [data-k="sk"]');await A.click('.skinds [data-k="sk"]');await A.waitForSelector('.stk-store .stk-num');
  ok(await A.evaluate(()=>/2002/.test($('.stk-store .stk-num').textContent)&&$('.stk-store').querySelectorAll('.stk-st.ok').length===10&&/✓ 2 medals/.test($('.stk-store').textContent)&&/Next reward at 2500 days/.test($('.stk-store').textContent)),'Store → 🔥 Streak: your streak, every reward ✓ Yours, 2 medals, the next at 2,500');
  await A.click('.skinds [data-k="cov"]');await A.waitForTimeout(300);
  ok(await A.evaluate(()=>{const c=document.querySelector('#tpl .tcardx[data-t="cov-deco"]'),f=document.querySelector('#tpl .tcardx[data-t="cov-flame"]');return /€1\.99/.test(c.textContent)&&/✓ Yours/.test(f.textContent)}),'Covers: paid ones €1.99, the streak ones “✓ Yours”');
  await A.click('#storex').catch(()=>A.evaluate(()=>showStore(false)));await A.waitForTimeout(300);

  // ======== 7) someone new sees the rewards locked; €1.99 everywhere
  const CB=await ctxOf(),B=await open(CB,'B');await signUp(B,'cold@example.com');
  await B.click('#storeb');await B.waitForSelector('.skinds [data-k="cov"]');await B.click('.skinds [data-k="cov"]');await B.waitForTimeout(300);
  ok(await B.evaluate(()=>{const f=document.querySelector('#tpl .tcardx[data-t="cov-flame"]');return /🔥 100 days/.test(f.textContent)&&/A 100-day streak reward/.test(f.textContent)}),'for someone else: “🔥 100 days” on the Golden flame cover');
  await B.click('#tpl .tcardx[data-t="cov-flame"]');await B.waitForSelector('#lockc.stkdlg .stk-num');ok(true,'… tapping it opens the streak');await B.evaluate(()=>$('#lockd').click());
  ok(await B.evaluate(()=>[...TPL,...COVERS,...LABELS,...STPK].filter(i=>i.p).every(i=>i.p===199)&&!ownsItem(itemById('cov-flame'))),'every paid item costs €1.99; the streak’s items aren’t anyone’s without the days');
  await B.evaluate(()=>{ACC.owned.add('all')});ok(await B.evaluate(()=>!ownsItem(itemById('cov-flame'))&&ownsItem(itemById('cov-galaxy'))),'a code for “everything” doesn’t give the streak’s items');

  // ======== 8) the admin gives 3 freezes
  await giveAdmin(B);await B.evaluate(()=>{ACC.owned.delete('all')});await B.evaluate(()=>showStore(false));
  await B.click('#menub');await B.click('#madm');await B.waitForSelector('.acats',{timeout:15000});await B.click('.acats >> text=Find an account');
  await B.fill('#adm-q','fire@');await B.waitForTimeout(400);
  ok(await B.evaluate(()=>/Streak 2002 days/.test($('#adm-acc').textContent)),'admin → Find an account: the streak (2,002 days) and freezes');
  await B.click('#adm-acc .afz');await B.waitForTimeout(1200);st=await getStk(uid);ok(st.b===3,'“Give 3 freezes”: 3 extra freezes');

  // ======== 9) offline: a day used offline counts when the internet is back
  await setStk(uid,{n:8,best:2002,d:T-1,f:1,b:3});await restart(A);st=await getStk(uid);ok(st.n===9,'(9 days)');
  await CA.setOffline(true);
  await A.evaluate(()=>{const n0=Date.now;window._n0=n0;Date.now=()=>n0()+864e5;stkSync()});await A.waitForFunction(()=>!STRK.busy,null,{timeout:30000});
  ok(await A.evaluate(()=>$('#stkn').textContent==='10'&&STRK.q.length===1),'offline the next day: the flame says 10 (kept on the device)');
  await CA.setOffline(false);await A.evaluate(()=>window.dispatchEvent(new Event('online')));
  await A.waitForFunction(()=>!STRK.q.length,null,{timeout:30000}).catch(()=>{});st=await getStk(uid);
  ok(st.n===10&&st.d===T+1,'back online: the day reaches the cloud (10 days)');
  await A.evaluate(()=>{Date.now=window._n0});

  // ======== 10) GDPR: in “Download my data”, deleted with the account
  ok(await A.evaluate(async()=>{const r=await myRecords();return !!r.streak&&r.streak.n===10}),'“Download my data” has the streak');
  await A.evaluate(()=>deleteAccount());await A.waitForSelector('#del-pw');await A.fill('#del-pw','secret123');await A.click('#lockc .btn.danger');
  await A.waitForFunction(()=>!ACC.user,null,{timeout:20000}).catch(()=>{});
  ok((await getStk(uid))===null,'deleting the account deletes the streak');

  // ======== 11) phones: the streak window fits
  for(const w of [390,360]){const CP=await ctxOf({viewport:{width:w,height:780},isMobile:true,hasTouch:true}),P=await open(CP,'P'+w);await signUp(P,'ph'+w+'@example.com');
    await P.waitForFunction(()=>!$('#stkb').classList.contains('hidden'),null,{timeout:15000});await shot(P,'stk-shelf-'+w);
    ok(await P.evaluate(()=>{const r=$('#stkb').getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth&&$('#stkn').textContent==='1'}),'phone '+w+' px: the flame fits in the shelf’s top bar');
    await P.evaluate(()=>{stkOpen()});await P.waitForSelector('#lockc.stkdlg .stk-num');
    ok(await P.evaluate(()=>{const c=$('#lockc').getBoundingClientRect();return c.left>=0&&c.right<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth&&[...$('#lockc').querySelectorAll('.stk-r,.stk-week,.stk-box')].every(e=>e.getBoundingClientRect().right<=c.right+1)}),'phone '+w+' px: the streak window fits');
    await shot(P,'stk-phone-'+w);await CP.close()}

  const errs=[...A.errs,...B.errs].filter(e=>!/Failed to fetch|network|offline|unavailable/i.test(e));ok(!errs.length,'no errors on the pages '+errs.join(' | '));
  await b.close();console.log(fails?'FAILED: '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
