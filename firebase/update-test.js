// After an update of the app, every notebook is still there (on the device and in the cloud).
// Notebooks are made with an OLDER version of the app (default: what is on origin/main), then the same address
// serves the NEW version (this folder's app/), like after a release. Same browser, same storage, service worker on.
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node update-test.js"
//   (OLD_REF=<git ref> picks another old version)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const NEW=path.join(__dirname,'..','app'),REF=process.env.OLD_REF||'origin/main';
const OLD=fs.mkdtempSync(path.join(os.tmpdir(),'foliet-old-'));
cp.execSync('git archive '+REF+' app | tar -x -C '+JSON.stringify(OLD),{cwd:path.join(__dirname,'..')});
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
let ROOT=path.join(OLD,'app');
// a function only the new version has: it tells which version is running (works for any old version)
const fnames=f=>new Set([...fs.readFileSync(f,'utf8').matchAll(/function (\w+)\(/g)].map(m=>m[1]));
const OLDF=fnames(path.join(OLD,'app','index.html')),MARK=[...fnames(path.join(NEW,'index.html'))].find(n=>!OLDF.has(n))||'';
const isNew=p=>p.evaluate(m=>!!m&&typeof window[m]==='function',MARK);
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
(async()=>{
  require('http').createServer((q,res)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!f.startsWith('/app/')){res.writeHead(404);return res.end()}
    f=path.join(ROOT,f.slice(4));if(f.endsWith(path.sep)||f===ROOT)f=path.join(f,'index.html');
    if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(fs.readFileSync(f))}else{res.writeHead(404);res.end('nf')}}).listen(5194,'127.0.0.1');
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1100,height:820}});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto('http://127.0.0.1:5194/app/?emu=127.0.0.1');await p.waitForSelector('#a-em',{timeout:15000});
  await p.click('.btn2');await p.fill('#a-em','keep@example.com');await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');
  await p.waitForFunction(()=>ACC.libUid&&!ACC.gate,null,{timeout:20000});await answerSurvey(p);
  ok(!!MARK&&!(await isNew(p)),'the old version of the app is running ('+REF+'; the new one has '+MARK+'())');
  const uid=await p.evaluate(()=>ACC.user.uid);
  await admin('pro/'+uid,{fields:{by:{stringValue:'admin'},since:{timestampValue:new Date().toISOString()},days:{integerValue:'0'}}});
  await p.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  // notebooks with drawings, page styles, a cover photo and many pages
  await p.evaluate(async()=>{
    const img=c=>{const k=document.createElement('canvas');k.width=k.height=40;const x=k.getContext('2d');x.fillStyle=c;x.fillRect(0,0,40,40);return k.toDataURL()};
    const a=mk('Holiday',data.length,'p');a.pages=[img('#c33'),img('#3c3'),null,img('#33c')];a.ps=[null,{p:'grid',c:'#fdfdfa'}];a.objs=[[{k:'note',c:'#fff2a8',t:'buy tickets',x:10,y:10,w:200,h:200,f:40,r:0}]];data.push(a);
    const c=mk('Sketches 2',data.length,'l');c.pages=Array(25).fill(null).map((_,i)=>i%3?null:img('#999'));c.cbg=img('#e80');data.push(c);
    persist();await saveNow();
  });
  const sig=()=>p.evaluate(()=>JSON.stringify(data.map(b=>[b.title,b.o,b.pages.length,b.pages.map(x=>x?x.length:0).join('.'),canon(b.ps),canon(b.objs),!!b.cbg]).sort()));
  const before=await sig();
  await p.waitForTimeout(1500);await p.evaluate(()=>syncRun());await p.waitForFunction(()=>!ACC.busy,null,{timeout:30000});await p.waitForTimeout(1500);
  const cloud=async()=>{const r=await admin('users/'+uid,null,'GET');const j=await r.json();return Object.keys((j.fields&&j.fields.m&&j.fields.m.mapValue.fields)||{}).length};
  const c0=await cloud();
  // versions before Update 14 can't change the cloud copy any more (the rules want the server's time on every change),
  // so their notebooks stay on the device and go up after the update; a newer old version syncs them right away
  ok(c0>30||c0===0,c0?'the old version saved and synced the notebooks ('+c0+' records in the cloud)':'the old version saved the notebooks on the device; the cloud refuses its changes (an old version can’t delete or change anything there)');
  ok(await p.evaluate(()=>!!navigator.serviceWorker.controller),'the app is installed (service worker running), like on a phone');

  // ---- the update: the same address now serves the new version
  ROOT=NEW;
  for(let i=0;i<3&&!(await isNew(p).catch(()=>false));i++){await p.reload();await p.waitForTimeout(1500)}
  await p.waitForFunction(m=>typeof window[m]==='function'&&ACC.libUid&&!ACC.gate&&data.length,MARK,{timeout:20000});
  ok(true,'the new version of the app is running');
  await p.waitForFunction(()=>ACC.pro,null,{timeout:15000});await p.waitForTimeout(1500);
  const after=await sig();
  ok(after===before,'after the update every notebook, page, drawing, note and page style is still there');
  await p.evaluate(()=>syncRun());await p.waitForFunction(()=>!ACC.busy,null,{timeout:30000});await p.waitForTimeout(1500);
  const c1=await cloud();
  ok(c1>=c0,'… and the cloud still has all of them ('+c0+' → '+c1+' records)');
  await p.reload();await p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});await p.waitForTimeout(1500);
  ok(await sig()===before,'and again after another restart');
  ok(await p.evaluate(()=>TRASH.length===0&&!LIBST.purge.length),'nothing was moved to Recently deleted or erased');
  // a new device signing in after the update gets everything from the cloud
  const ctx2=await b.newContext({viewport:{width:1100,height:820}});await ctx2.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx2.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
  const q=await ctx2.newPage();await q.goto('http://127.0.0.1:5194/app/?emu=127.0.0.1');await q.waitForSelector('#a-em',{timeout:15000});
  await q.fill('#a-em','keep@example.com');await q.fill('#a-pw','secret123');await q.click('#acc-body button[type=submit]');
  await q.waitForFunction(()=>ACC.libUid&&!ACC.gate&&ACC.pro,null,{timeout:20000});await q.waitForTimeout(1500);
  await q.evaluate(()=>syncRun());await q.waitForFunction(()=>!ACC.busy,null,{timeout:30000});await q.waitForTimeout(1500);
  const sq=await q.evaluate(()=>JSON.stringify(data.map(b=>[b.title,b.o,b.pages.length,b.pages.map(x=>x?x.length:0).join('.'),canon(b.ps),canon(b.objs),!!b.cbg]).sort()));
  ok(sq===before,'a second device gets exactly the same notebooks from the cloud');if(sq!==before)console.log('DIFF\n'+before+'\n'+sq);

  p.errs.forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
