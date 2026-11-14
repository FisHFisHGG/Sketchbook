// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node sync-test.js"
// Runs inside `firebase emulators:exec`. Two browser contexts = two devices of the same user.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','app'),PID='sketchbook-b1de1';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
async function device(b,name){
  const ctx=await b.newContext({viewport:{width:1000,height:800}});
  await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});
  await ctx.route(u=>/(googleapis|gstatic|google)\.com$/.test(u.hostname),r=>r.abort()); // only the local emulators
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(name+' PAGEERR '+e.message));
  p.on('console',m=>{if(m.type()==='error')p.errs.push(name+' console: '+m.text().slice(0,200))});
  await p.goto('http://127.0.0.1:5173/?emu=127.0.0.1');await p.waitForTimeout(700);
  return p;
}
const signIn=async(p,em,pw,create)=>{
  await p.waitForSelector('#a-em',{timeout:15000}); // the app opens on the sign-in screen
  if(create){await p.click('.btn2');await p.waitForSelector('text=Sign in instead')}
  await p.fill('#a-em',em);await p.fill('#a-pw',pw);await p.click('#acc-body button[type=submit]');
  try{await p.waitForFunction(()=>ACC.user,null,{timeout:15000})}catch(e){console.log('SIGNIN DEBUG:',await p.evaluate(()=>document.querySelector('#acc-body').innerText.slice(0,400)),p.errs);throw e}
  await p.waitForFunction(()=>ACC.libUid&&document.querySelector('#acct').classList.contains('hidden'),null,{timeout:15000});
};
const books=p=>p.evaluate(()=>data.map(b=>b.title+'['+b.pages.map(x=>x?'img':'-').join('')+']'+(b.objs.flat().filter(Boolean).map(o=>o.t).join('/')||'')).sort().join(' | '));
const settle=async p=>{await p.waitForTimeout(600);await p.waitForFunction(()=>!ACC.busy&&!ACC.timer||!ACC.busy,null,{timeout:20000});await p.evaluate(()=>syncRun());await p.waitForFunction(()=>!ACC.busy,null,{timeout:20000});await p.waitForTimeout(300)};
async function grantPro(uid){
  const r=await fetch('http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents/pro?documentId='+uid,{method:'POST',headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{since:{stringValue:'test'}}})});
  if(!r.ok)throw new Error('grant '+r.status+' '+await r.text());
}
(async()=>{
  // a real local web server for the app (so the page and the emulators are both on localhost)
  require('http').createServer((q,res)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(f.endsWith('/'))f+='index.html';f=path.join(ROOT,f);
    if(f.startsWith(ROOT)&&fs.existsSync(f)){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))}else{res.writeHead(404);res.end('nf')}}).listen(5173,'127.0.0.1');
  const b=await chromium.launch({args:['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessRespectPreflightResults']});
  const A=await device(b,'A');
  await signIn(A,'ana@example.com','secret123',true);
  // A works on the free plan first
  await A.evaluate(()=>{const t=mk('Trip',0);t.pages=[null,null,null];t.objs=[[{k:'note',c:'#ffe14d',t:'pack',x:1,y:1,w:9,h:9,f:40,r:0}]];data=[ens(t)];persist();renderShelf()}); // replaces the welcome notebook
  await A.waitForTimeout(500);
  ok(await A.evaluate(()=>ACC.user.email)==='ana@example.com','A: account created and signed in');
  ok(await A.evaluate(()=>!ACC.pro&&document.querySelector('#plan').textContent==='Free plan'),'A: free plan, no sync');
  const denied=await A.evaluate(async()=>{try{const F=ACC.F,bt=F.writeBatch(ACC.db);bt.set(F.doc(ACC.db,'users',ACC.user.uid),{m:{x:{h:'1',n:1}},v:1},{merge:true});await bt.commit();return false}catch(e){return e.code}});
  ok(denied==='permission-denied','rules: free user cannot write to the cloud ('+denied+')');
  const selfPro=await A.evaluate(async()=>{try{const F=ACC.F,bt=F.writeBatch(ACC.db);bt.set(F.doc(ACC.db,'pro',ACC.user.uid),{x:1});await bt.commit();return false}catch(e){return e.code}});
  ok(selfPro==='permission-denied','rules: a user cannot make themselves Pro ('+selfPro+')');
  const uid=await A.evaluate(()=>ACC.user.uid);
  await grantPro(uid);
  await A.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  ok(await A.evaluate(()=>document.querySelector('#plan').textContent)==='Pro','A: Pro detected live (plan button says Pro)');
  await settle(A);
  const man=await A.evaluate(()=>Object.keys(ACC.man).sort().join(','));
  ok(/idx/.test(man)&&/b~/.test(man)&&(man.match(/p~/g)||[]).length===3,'A: notebook uploaded (manifest: '+man.length+' chars, 3 pages)');
  // A draws on page 2 for real
  await A.click('.cell:not(.add)');await A.waitForTimeout(500);await A.click('#bnext');await A.waitForTimeout(900);await A.click('#pr');await A.waitForTimeout(900);
  const r=await A.locator('#paper').boundingBox();await A.mouse.move(r.x+60,r.y+60);await A.mouse.down();await A.mouse.move(r.x+300,r.y+260,{steps:8});await A.mouse.up();
  await A.waitForTimeout(400);await A.click('#back');await A.waitForTimeout(700);await A.click('#bclose');await A.waitForTimeout(400);
  await settle(A);
  const aBooks=await books(A);
  // device B: fresh, signs in
  const B=await device(b,'B');
  await signIn(B,'ana@example.com','secret123',false);
  await B.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  await settle(B);
  ok(await books(B)===aBooks,'B: received A\'s notebooks, starter dropped → '+await books(B));
  const pgA=await A.evaluate(()=>data[0].pages[1]),pgB=await B.evaluate(()=>data.find(x=>x.title==='Trip').pages[1]);
  ok(pgA&&pgA===pgB,'B: the drawing on page 2 is identical ('+(pgB?pgB.length:0)+' chars)');
  // B renames, deletes page 3, adds a new notebook
  await B.evaluate(()=>{const t=data.find(x=>x.title==='Trip');t.title='Trip to Rome';t._sv=(t._sv||0)+1;['pages','objs','pv','bg','ps','lay'].forEach(a=>t[a].splice(2,1));const n=mk('Recipes',1);data.push(n);persist()});
  await B.waitForTimeout(500);await settle(B);
  await A.waitForTimeout(1500);await settle(A);
  ok(await books(A)===await books(B),'A: got B\'s changes → '+await books(A));
  // A deletes the Recipes notebook
  await A.evaluate(()=>{data=data.filter(b=>b.title!=='Recipes');persist()});await A.waitForTimeout(500);await settle(A);
  await B.waitForTimeout(1500);await settle(B);
  ok(!(await books(B)).includes('Recipes'),'B: notebook deleted on A disappears → '+await books(B));
  // reload B: everything stays, nothing re-uploaded
  await B.reload();await B.waitForTimeout(800);await B.waitForFunction(()=>ACC.pro,null,{timeout:15000});await settle(B);
  ok(await books(B)===await books(A),'B: after reload still in sync');
  const writes=await B.evaluate(()=>Object.keys(ACC.state.h).length);
  ok(writes>0,'B: remembers what is synced ('+writes+' records)');
  // a second, non-Pro user sees nothing of Ana's
  const C=await device(b,'C');await signIn(C,'bob@example.com','secret123',true);
  const peek=await C.evaluate(async uid=>{try{await ACC.F.getDoc(ACC.F.doc(ACC.db,'users',uid));return 'read!'}catch(e){return e.code}},uid);
  ok(peek==='permission-denied','rules: another user cannot read Ana\'s notebooks ('+peek+')');
  // a very big page (split in chunks), then shrunk again
  await A.evaluate(()=>{const t=data.find(x=>x.title==='Trip to Rome');t.pages[0]='data:image/webp;base64,'+'Q'.repeat(750000);persist()});
  await A.waitForTimeout(500);await settle(A);
  const n1=await A.evaluate(()=>{const t=data.find(x=>x.title==='Trip to Rome');return ACC.man['p~'+t.id+'~0'].n});
  await B.waitForTimeout(1500);await settle(B);
  ok(n1===3&&await B.evaluate(()=>data.find(x=>x.title==='Trip to Rome').pages[0].length)===750023,'big page: uploaded in '+n1+' chunks and rebuilt on B');
  await A.evaluate(()=>{const t=data.find(x=>x.title==='Trip to Rome');t.pages[0]='data:image/webp;base64,small';persist()});
  await A.waitForTimeout(500);await settle(A);
  const bid=await A.evaluate(()=>String(data.find(x=>x.title==='Trip to Rome').id));
  const st=(await fetch('http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents/users/'+uid+'/r/'+encodeURIComponent('p~'+bid+'~0~~2'),{headers:{Authorization:'Bearer owner'}})).status;
  ok(st===404,'big page shrunk: leftover chunk removed from the cloud (HTTP '+st+')');
  // B has the notebook open while A renames it: B updates only after closing it
  await B.evaluate(()=>{const t=data.find(x=>x.title==='Trip to Rome');showBrowse(t)});await B.waitForTimeout(600);
  await A.evaluate(()=>{data.find(x=>x.title==='Trip to Rome').title='Rome';persist()});await A.waitForTimeout(500);await settle(A);
  await B.waitForTimeout(1500);await settle(B);
  const whileOpen=await B.evaluate(()=>cur.title);
  await B.click('#bclose');await B.waitForTimeout(500);await settle(B);
  ok(whileOpen==='Trip to Rome'&&(await books(B)).startsWith('Rome['),'B: open notebook not changed under your hands; updated after closing ('+whileOpen+' → '+await books(B)+')');
  // sign out keeps notebooks
  await settle(A);const before=await books(A);await A.click('#accb');await A.waitForSelector('text=Sign out');await A.click('text=Sign out');
  await A.waitForFunction(()=>!ACC.user&&ACC.gate,null,{timeout:10000});
  ok(await A.evaluate(()=>data.length)===0,'A: signed out → sign-in screen, notebooks hidden');
  await signIn(A,'ana@example.com','secret123',false);await A.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  ok(await books(A)===before,'A: signs in again → same notebooks');
  
  for(const p of [A,B,C])p.errs.forEach(e=>console.log('  ',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');
  await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
