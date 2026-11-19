// Update 14 – notebooks never go to Recently deleted by mistake.
// - an old version of the app (which deleted from the cloud the notebooks it didn't have) can't change the cloud copy any more:
//   every change must carry the server's time (rules: users/{uid}.at == request.time)
// - the cloud's list missing every notebook (a broken copy): nothing goes to Recently deleted, the device sends them again
// - a notebook really deleted on another device still goes to Recently deleted here ("deleted on another device")
// - a page missing from the cloud never wipes the page here; it goes up again
// - a notebook deleted here but changed on another device since: it comes back instead of deleting the newer copy
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node safety-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SITE=path.join(__dirname,'..'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
(async()=>{
  require('http').createServer((q,res)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!u.startsWith('/Sketchbook/')){res.writeHead(404);return res.end()}
    let f=path.join(SITE,u.slice('/Sketchbook/'.length));if(u.endsWith('/'))f=path.join(f,'index.html');
    if(f.startsWith(SITE)&&!/^(firebase|\.git)\b|CLAUDE/.test(path.relative(SITE,f))&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});return res.end(fs.readFileSync(f))}
    res.writeHead(404);res.end()}).listen(5192,'127.0.0.1');
  const b=await chromium.launch();const URL0='http://127.0.0.1:5192/Sketchbook/app/?emu=127.0.0.1';
  const dev=async name=>{const ctx=await b.newContext({viewport:{width:1100,height:800}});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
    const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(name+': '+e.message));await p.goto(URL0);return p};
  const signIn=async(p,em,create)=>{await p.waitForSelector('#a-em',{timeout:15000});if(create)await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');
    await p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});await answerSurvey(p);await p.waitForTimeout(500)};
  const settle=async p=>{await p.waitForTimeout(700);await p.waitForFunction(()=>!ACC.busy,null,{timeout:60000});await p.evaluate(()=>syncRun());await p.waitForFunction(()=>!ACC.busy,null,{timeout:60000});await p.waitForTimeout(400)};
  const shelf=p=>p.evaluate(()=>data.map(x=>x.title).sort().join(', '));
  const trash=p=>p.evaluate(()=>TRASH.map(t=>t.title+(t.r?' (another device)':'')).sort().join(', '));
  const cloudBooks=async uid=>{const d=await (await admin('users/'+uid,null,'GET')).json();return Object.keys((d.fields&&d.fields.m&&d.fields.m.mapValue.fields)||{}).filter(k=>k.startsWith('b~'))};

  // ---- two devices of one Pro account, 3 notebooks synced
  const A=await dev('A');await signIn(A,'safe14@example.com',true);const uid=await A.evaluate(()=>ACC.user.uid);
  await admin('pro/'+uid,{fields:{by:{stringValue:'admin'},days:{integerValue:'0'}}});await A.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  await A.evaluate(async()=>{for(const t of ['Diary','School','Trip']){const bk=mk(t,data.length,'p');bk.pages=['data:image/webp;base64,'+t+'1',('data:image/webp;base64,'+t+'2')];data.push(bk)}persist();await saveNow()});
  await settle(A);
  const B=await dev('B');await signIn(B,'safe14@example.com',false);await B.waitForFunction(()=>ACC.pro,null,{timeout:15000});await settle(B);await settle(A);
  ok(/Diary, School, Trip/.test(await shelf(B)),'B (a second device) has the 3 notebooks: '+await shelf(B));
  ok((await cloudBooks(uid)).length>=4,'the cloud list has them');

  // ---- an old version of the app can't change the cloud copy any more
  const old=await A.evaluate(async()=>{const F=ACC.F,db=ACC.db,u=ACC.user.uid,c=Object.keys(ACC.man).find(k=>k.startsWith('b~')),bt=F.writeBatch(db); // what an old version did for a notebook it didn't have
    bt.delete(F.doc(db,'users',u,'r',c));bt.set(F.doc(db,'users',u),{m:{[c]:F.deleteField()}},{merge:true});
    try{await bt.commit();return 'written'}catch(e){return e.code}});
  ok(old==='permission-denied','an old version of the app tries to delete a notebook from the cloud: refused ('+old+')');
  const old2=await A.evaluate(async()=>{const F=ACC.F;try{await F.setDoc(F.doc(ACC.db,'users',ACC.user.uid),{m:{'b~x':{h:'1',n:1}},v:1},{merge:true});return 'written'}catch(e){return e.code}});
  ok(old2==='permission-denied','… and can’t add or change anything either (no server time stamp)');
  ok((await cloudBooks(uid)).length>=4,'the cloud copy is untouched');

  // ---- a notebook really deleted on A: B moves it to Recently deleted ("deleted on another device")
  await A.evaluate(()=>trashBook(data.find(x=>x.title==='Trip')));await settle(A);await settle(B);
  ok(!/Trip/.test(await shelf(B))&&/Trip \(another device\)/.test(await trash(B)),'deleted on A on purpose: on B it goes to Recently deleted (“deleted on another device”), restorable');

  // ---- the cloud's list loses every notebook (a broken copy): nothing goes to Recently deleted, B sends them again
  await B.evaluate(()=>syncStop());
  const keep=await (await admin('users/'+uid,null,'GET')).json();
  await admin('users/'+uid,{fields:{m:{mapValue:{fields:Object.fromEntries(Object.entries(keep.fields.m.mapValue.fields).filter(([k])=>!/^(b|p)~/.test(k)))}},v:{integerValue:'2'}}});
  await B.evaluate(()=>syncStart());await B.waitForTimeout(1500);await settle(B);
  ok(/Diary, School/.test(await shelf(B))&&!/Diary|School/.test(await trash(B)),'the cloud list lost every notebook: B moves none of them to Recently deleted ('+await shelf(B)+')');
  ok((await cloudBooks(uid)).length>=3,'… and sends them to the cloud again ('+(await cloudBooks(uid)).length+' notebooks in the list)');
  await settle(A);
  ok(/Diary, School/.test(await shelf(A))&&!/Diary|School/.test(await trash(A)),'A keeps them too');

  // ---- a page missing from the cloud never wipes the page here
  const pk=await B.evaluate(()=>{const bk=data.find(x=>x.title==='School');return 'p~'+bk.id+'~1'});
  await B.evaluate(()=>syncStop());
  const m2=await (await admin('users/'+uid,null,'GET')).json();delete m2.fields.m.mapValue.fields[pk];
  await admin('users/'+uid+'?updateMask.fieldPaths=m',{fields:{m:m2.fields.m}});
  await B.evaluate(()=>syncStart());await B.waitForTimeout(1500);await settle(B);
  ok(await B.evaluate(()=>data.find(x=>x.title==='School').pages[1]==='data:image/webp;base64,School2'),'a page missing from the cloud: the page here is kept (not wiped)');
  ok(await (async()=>{const d=await (await admin('users/'+uid,null,'GET')).json();return !!d.fields.m.mapValue.fields[pk]})(),'… and goes up to the cloud again');

  // ---- deleted on B while it was offline, edited on A meanwhile: it comes back instead of deleting A's newer copy
  await B.evaluate(()=>syncStop());
  await B.evaluate(()=>trashBook(data.find(x=>x.title==='Diary')));
  await A.evaluate(()=>{const bk=data.find(x=>x.title==='Diary');bk.pages.push('data:image/webp;base64,Diary3');persist()});await settle(A);
  await B.evaluate(()=>syncStart());await B.waitForTimeout(1500);await settle(B);await settle(A);
  ok(/Diary/.test(await shelf(B))&&!/Diary/.test(await trash(B))&&await B.evaluate(()=>data.find(x=>x.title==='Diary').pages.length===3),'B deleted “Diary” offline while A added a page to it: on B it comes back with A’s new page');
  ok(/Diary/.test(await shelf(A)),'… and A still has it');

  // ---- an ordinary delete on B still works when nobody changed the notebook meanwhile
  await B.evaluate(()=>trashBook(data.find(x=>x.title==='Diary')));await settle(B);await settle(A);
  ok(!/Diary/.test(await shelf(A))&&/Diary \(another device\)/.test(await trash(A)),'deleting “Diary” on B again (nobody changed it): it goes to Recently deleted on A');

  [...A.errs,...B.errs].forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
