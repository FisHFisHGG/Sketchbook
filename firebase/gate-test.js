// Account required: sign-in screen, one library per account on a device, offline start.
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node gate-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','app');
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
// the one-time "How did you find Foliet?" question appears after a new account; answer it so the test can go on
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const URL0='http://127.0.0.1:5175/app/?emu=127.0.0.1';
(async()=>{
  require('http').createServer((q,res)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!f.startsWith('/app/')){res.writeHead(404);return res.end()}
    f=path.join(ROOT,f.slice(4));if(f.endsWith(path.sep)||f===ROOT)f=path.join(f,'index.html');
    if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))}else{res.writeHead(404);res.end('nf')}}).listen(5175,'127.0.0.1');
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1000,height:800}});
  await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});
  await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  const gate=()=>p.evaluate(()=>!document.querySelector('#acct').classList.contains('hidden')&&document.querySelector('#acct').classList.contains('gate'));
  const titles=()=>p.evaluate(()=>data.map(b=>b.title).sort().join(', '));
  const sign=async(em,create)=>{
    await p.waitForSelector('#a-em',{timeout:15000});
    if(create){await p.click('.btn2');await p.waitForSelector('text=Sign in instead')}
    await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');
    try{await p.waitForFunction(()=>ACC.user&&ACC.libUid&&document.querySelector('#acct').classList.contains('hidden'),null,{timeout:15000})}
    catch(e){console.log('DEBUG',await p.evaluate(()=>({u:ACC.user&&ACC.user.email,lib:ACC.libUid,gate:ACC.gate,body:document.querySelector('#acc-body').innerText.slice(0,300)})),errs);throw e}
    await answerSurvey(p);await p.waitForTimeout(300);
  };
  const out=async()=>{await p.click('#menub');await p.click('#mout');await p.waitForFunction(()=>!ACC.user&&ACC.gate,null,{timeout:10000});await p.waitForTimeout(200)};
  // notebooks left by the older app version, before any account existed
  await p.goto(URL0);await p.waitForTimeout(500);
  await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=900;c.height=1200;c.getContext('2d').fillRect(0,0,50,50);
    await idbSet('schita-v1',[{id:1,title:'Old diary',color:'#23407a',cover:null,pages:[c.toDataURL('image/webp',.8)],objs:[],pv:[],cobjs:[],cpv:null,bg:[],ps:[],lay:[],o:'p',u:1}])});
  await p.reload();await p.waitForTimeout(800);
  ok(await gate(),'opening the app shows the sign-in screen');
  ok(await p.evaluate(()=>!!document.querySelector('#acc-theme').offsetParent),'the sign-in screen has the sun/moon theme button');
  ok(await p.evaluate(()=>data.length)===0,'no notebooks visible before signing in');
  ok(await p.evaluate(()=>!document.querySelector('#acc-x').offsetParent),'the sign-in screen can\'t be closed');
  await sign('first@example.com',true);
  ok(await titles()==='Old diary','first account keeps the notebooks already on the device ('+await titles()+')');
  await p.evaluate(()=>{data.push(ens(mk('Ideas',1)));persist()});await p.waitForTimeout(600);
  await out();
  ok(await gate()&&await p.evaluate(()=>data.length)===0,'after sign out: sign-in screen, notebooks hidden');
  await sign('second@example.com',true);
  ok(await titles()==='Welcome to Foliet','second account on the same device sees only its own notebooks ('+await titles()+')');
  await p.evaluate(()=>{data[0].title='Bob notes';persist()});await p.waitForTimeout(600);
  await out();
  await sign('first@example.com',false);
  ok(await titles()==='Ideas, Old diary','first account signs in again: its notebooks are back ('+await titles()+')');
  // offline start for someone who signed in before
  await p.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active)},null,{timeout:10000});
  await p.reload();await p.waitForTimeout(1500); // let the service worker cache everything
  await ctx.setOffline(true);
  await p.reload();await p.waitForTimeout(2500);
  ok(!(await gate())&&await titles()==='Ideas, Old diary','offline start: notebooks open without internet ('+await titles()+')');
  await ctx.setOffline(false);
  // a brand-new device that can't reach the sign-in service
  const c2=await b.newContext();await c2.route(u=>u.hostname!=='127.0.0.1'||/vendor\/firebase\.js/.test(u.pathname),r=>r.abort());const q=await c2.newPage();
  await q.goto(URL0);await q.waitForTimeout(1200);
  ok(await q.evaluate(()=>ACC.gate&&/offline/.test(document.querySelector('#acc-body').innerText)&&data.length===0),'new device without connection: sign-in screen asks to connect, no notebooks');
  errs.forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
