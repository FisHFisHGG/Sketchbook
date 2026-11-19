// The start window and working offline (Update 15).
// - Foliet starts with a window that shows the checks (app, account, notebooks, storage, and for Pro the cloud)
// - no internet at the start: "You're offline" with "Continue offline", "Back up now" and "Try again"
// - a Pro account stays Pro offline (no free limits, Recently deleted keeps 30 days)
// - what you do offline goes to the cloud by itself when the internet is back, and reaches the other device
// - the cloud can't be reached (but the device says it's online): the same choice
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node offline-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SITE=path.join(__dirname,'..'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.json':'application/json','.css':'text/css'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
(async()=>{
  require('http').createServer((q,res)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!u.startsWith('/Sketchbook/')){res.writeHead(404);return res.end()}
    let f=path.join(SITE,u.slice('/Sketchbook/'.length));if(u.endsWith('/'))f=path.join(f,'index.html');
    if(f.startsWith(SITE)&&!/^(firebase|\.git)\b|CLAUDE/.test(path.relative(SITE,f))&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});return res.end(fs.readFileSync(f))}
    res.writeHead(404);res.end()}).listen(5196,'127.0.0.1');
  const b=await chromium.launch();const URL0='http://127.0.0.1:5196/Sketchbook/app/?emu=127.0.0.1';
  const dev=async name=>{const ctx=await b.newContext({viewport:{width:1100,height:800}});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
    const p=await ctx.newPage();p.ctx=ctx;p.errs=[];p.on('pageerror',e=>p.errs.push(name+': '+e.message));await p.goto(URL0);return p};
  const signIn=async(p,em,create)=>{await p.waitForSelector('#a-em',{timeout:15000});if(create)await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');
    await p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});await answerSurvey(p);await p.waitForTimeout(500)};
  const settle=async p=>{await p.waitForTimeout(700);await p.waitForFunction(()=>!ACC.busy,null,{timeout:60000});await p.evaluate(()=>syncRun());await p.waitForFunction(()=>!ACC.busy,null,{timeout:60000});await p.waitForTimeout(400)};
  const shelf=p=>p.evaluate(()=>data.map(x=>x.title).sort().join(', '));
  const bootGone=p=>p.waitForFunction(()=>$('#boot').classList.contains('hidden'),null,{timeout:30000});

  // ---- the start window on a fresh device: checks, then the sign-in window
  const A=await dev('A');
  ok(await A.evaluate(()=>!$('#boot').classList.contains('hidden')&&/Getting your notebooks ready/.test($('#boot').textContent)),'Foliet starts with a window: “Getting your notebooks ready”');
  await bootGone(A);ok(await A.evaluate(()=>ACC.gate&&!$('#acct').classList.contains('hidden')),'… nobody signed in: then the sign-in window');

  // ---- a Pro account with a notebook, on two devices
  await signIn(A,'off15@example.com',true);const uid=await A.evaluate(()=>ACC.user.uid);
  await admin('pro/'+uid,{fields:{by:{stringValue:'admin'},days:{integerValue:'0'}}});await A.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  await A.evaluate(async()=>{const bk=mk('Journal',data.length,'p');bk.pages=['data:image/webp;base64,J1'];data.push(bk);persist();await saveNow()});
  await settle(A);
  const B=await dev('B');await signIn(B,'off15@example.com',false);await B.waitForFunction(()=>ACC.pro,null,{timeout:15000});await settle(B);
  ok(/Journal/.test(await shelf(B)),'B (second device) has “Journal”');

  // ---- A starts again (online): the checks, with the cloud
  await A.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active)},null,{timeout:15000});
  await A.reload();await bootGone(A);
  const st=await A.evaluate(()=>[...document.querySelectorAll('#boot li')].map(l=>l.dataset.s+':'+(l.dataset.st||'-')).join(' '));
  ok(/app:ok acct:ok lib:ok store:ok cloud:ok/.test(st),'the start window checks everything, then opens the shelf ('+st+')');
  ok(await A.evaluate(()=>!ACC.gate&&data.some(x=>x.title==='Journal')),'… with the notebooks');

  // ---- A starts without internet
  await A.ctx.setOffline(true);await A.reload();
  await A.waitForFunction(()=>$('#boot').classList.contains('offline'),null,{timeout:20000});
  ok(await A.evaluate(()=>/You’re offline/.test($('#boot').textContent)&&/Continue offline/.test($('#boff-go').textContent)&&/Back up now/.test($('#boff-bak').textContent)&&/make a backup/i.test($('#boot .b-tip').textContent)),'no internet: “You’re offline”, “Continue offline”, “Back up now” and the backup tip');
  ok(await A.evaluate(()=>/go to the cloud by themselves/.test($('#boff-t').textContent)),'… and it says the changes go to the cloud when the internet is back (Pro)');
  const dl=A.waitForEvent('download',{timeout:10000}).catch(()=>null);await A.click('#boff-bak');const d=await dl;
  ok(!!d&&/^foliet-backup-.*\.json$/.test(d.suggestedFilename()),'“Back up now” downloads a backup file ('+(d&&d.suggestedFilename())+')');
  await A.click('#boff-go');await bootGone(A);
  ok(await A.evaluate(()=>ACC.pro&&plan==='pro'),'offline, the account is still Pro (no free limits)');
  await A.evaluate(async()=>{const j=data.find(x=>x.title==='Journal');j.pages.push('data:image/webp;base64,J2');j.u=Date.now();
    for(const t of ['Offline 1','Offline 2','Offline 3']){const bk=mk(t,data.length,'p');bk.pages=['data:image/webp;base64,'+t.replace(' ','')];data.push(bk)}
    const x=mk('Old list',data.length,'p');data.push(x);persist();await saveNow();trashBook(x);persist();await saveNow()});
  ok(await A.evaluate(()=>{const t=TRASH.find(e=>e.title==='Old list');return t&&Math.round((t.x-Date.now())/864e5)===30}),'a notebook deleted offline stays 30 days in Recently deleted (Pro), not 2');

  // ---- the internet is back: what was done offline goes up, and reaches B
  await A.ctx.setOffline(false);
  await A.waitForFunction(()=>ACC.man&&!ACC.busy&&ACC.last>Date.now()-60000,null,{timeout:60000}).catch(()=>{});await settle(A);
  const m=await (await admin('users/'+uid,null,'GET')).json(),bk=Object.keys(m.fields.m.mapValue.fields).filter(k=>k.startsWith('b~')).length;
  ok(bk>=5,'back online: the 3 new notebooks go to the cloud by themselves ('+bk+' notebooks there)');
  await settle(B);
  ok(/Journal, Offline 1, Offline 2, Offline 3/.test(await shelf(B))&&await B.evaluate(()=>data.find(x=>x.title==='Journal').pages.length===2),'… and B gets them, with the page added offline ('+await shelf(B)+')');
  ok(await B.evaluate(()=>!data.some(x=>x.title==='Old list')),'… and the notebook deleted offline is gone there too');

  // ---- the device says it's online, but the cloud can't be reached
  const cut=u=>u.port==='8080',drop=r=>r.abort();await A.ctx.route(cut,drop);await A.reload();
  await A.waitForFunction(()=>$('#boot').classList.contains('offline'),null,{timeout:40000}).catch(()=>{});
  ok(await A.evaluate(()=>$('#boot').classList.contains('offline')&&/Can’t reach the cloud/.test($('#boot').textContent)),'the cloud can’t be reached: “Can’t reach the cloud right now” with the same choice');
  await A.ctx.unroute(cut,drop);
  await A.click('#boff-try');await bootGone(A);
  ok(await A.evaluate(()=>!ACC.gate&&data.some(x=>x.title==='Offline 3')),'“Try again” once it can: the shelf opens');

  [...A.errs,...B.errs].forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
