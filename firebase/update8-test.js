// Update 8: your shelf, your way – the Store button at the top, categories as tabs (Pro), tags, your own order
// (drag a notebook, or ⋯ → Move earlier/later), the ⋯ menu on every notebook, and the sync pill at the top
// ("Syncing 1 of 3 notebooks"). Categories, tags and order sync between devices.
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node update8-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','app'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
(async()=>{
  require('http').createServer((q,res)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!f.startsWith('/app/')){res.writeHead(404);return res.end()}
    f=path.join(ROOT,f.slice(4));if(f.endsWith(path.sep)||f===ROOT)f=path.join(f,'index.html');
    if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))}else{res.writeHead(404);res.end('nf')}}).listen(5191,'127.0.0.1');
  const b=await chromium.launch();
  const URL0='http://127.0.0.1:5191/app/?emu=127.0.0.1';
  const ctxOf=async()=>{const ctx=await b.newContext({viewport:{width:1100,height:820}});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());return ctx};
  const open=async(ctx,name)=>{const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(name+': '+e.message));await p.goto(URL0);return p};
  const ready=p=>p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});
  const signUp=async(p,em)=>{await p.waitForSelector('#a-em',{timeout:15000});await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');await ready(p);await answerSurvey(p);await p.waitForTimeout(400)};
  const signIn=async(p,em)=>{await p.waitForSelector('#a-em',{timeout:15000});await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');await ready(p);await answerSurvey(p);await p.waitForTimeout(400)};
  const reload=async p=>{await p.reload();await ready(p);await p.waitForTimeout(1000)};
  const newBook=(p,t,pages=1)=>p.evaluate(async([t,n])=>{const b=mk(t,data.length,'p');b.pages=Array(n).fill(null);catNew(b);data.push(b);persist();await saveNow();renderShelf()},[t,pages]);
  const shown=p=>p.evaluate(()=>[...document.querySelectorAll('#grid .cw[data-id]')].map(e=>{const b=data.find(x=>String(x.id)===e.dataset.id);return b?b.title:'?'}).join(', '));
  const idOf=(p,t)=>p.evaluate(t=>String(data.find(b=>b.title===t).id),t);
  const cellBox=async(p,t)=>p.locator('.cw[data-id="'+await idOf(p,t)+'"] .cell').boundingBox();
  const more=async(p,t)=>{await p.click('.cw[data-id="'+await idOf(p,t)+'"] .more');await p.waitForSelector('#pop')};
  const drag=async(p,from,x,y)=>{const a=from;await p.mouse.move(a.x+a.width/2,a.y+a.height/3);await p.mouse.down();
    for(let i=1;i<=14;i++){await p.mouse.move(a.x+a.width/2+(x-a.x-a.width/2)*i/14,a.y+a.height/3+(y-a.y-a.height/3)*i/14);await p.waitForTimeout(25)}
    await p.waitForTimeout(450);await p.mouse.up();await p.waitForTimeout(500)};
  const settle=async p=>{await p.evaluate(()=>saveNow());await p.waitForTimeout(800);await p.evaluate(()=>syncRun());await p.waitForFunction(()=>!ACC.busy,null,{timeout:30000});await p.waitForTimeout(800)};
  const tabs=p=>p.evaluate(()=>[...document.querySelectorAll('#cats .cat')].map(t=>t.textContent).join(' | '));

  // ---- 1) free plan: the Store is a button at the top, the tabs are categories
  const C1=await ctxOf(),A=await open(C1,'A');await signUp(A,'ana8@example.com');
  ok(await A.evaluate(()=>!!$('#shelf header #storeb')&&![...document.querySelectorAll('#cats .cat')].some(t=>/Store/.test(t.textContent))),'the Store is a button at the top (next to the theme button), not a tab any more');
  await A.click('#storeb');await A.waitForSelector('.tstore');
  ok(await A.evaluate(()=>!$('#tpl').classList.contains('hidden')&&$('#cats').classList.contains('hidden')&&$('#storeb').getAttribute('aria-pressed')==='true'),'Store opens in place of the shelf');
  await A.click('#storex');await A.waitForTimeout(300);
  ok(await A.evaluate(()=>!$('#grid').classList.contains('hidden')&&$('#tpl').classList.contains('hidden')),'"‹ My notebooks" goes back to the shelf');
  ok(await tabs(A)==='Notebooks'&&await A.evaluate(()=>!!$('#catadd .soon')),'the tabs: "Notebooks" and a "+" (with a Pro badge on the free plan)');
  await A.click('#catadd');await A.waitForTimeout(300);
  ok(await A.evaluate(()=>!$('#up').classList.contains('hidden')&&/categories/.test($('#upm').textContent)),'free plan: "+" explains that your own categories are part of Pro');
  await A.evaluate(()=>$('#up').classList.add('hidden'));
  await newBook(A,'Math');await newBook(A,'History');
  // the ⋯ menu
  await more(A,'Math');
  ok(await A.evaluate(()=>['Open','Rename','Tags','Move to category','Move earlier','Move later','Delete'].every(t=>[...document.querySelectorAll('#pop .pop-i')].some(b=>b.textContent.startsWith(t)))),'every notebook has a ⋯ menu: Open, Rename, Tags, Move to category, Move earlier/later, Delete');
  await A.keyboard.press('Escape');ok(await A.evaluate(()=>!$('#pop')),'Escape closes the menu');
  await more(A,'Math');await A.click('#pop >> text=Rename');await A.waitForSelector('#nm-in');await A.fill('#nm-in','Algebra');await A.click('#lockd .btn:text("Save")');await A.waitForTimeout(400);
  ok(await A.evaluate(()=>data.some(b=>b.title==='Algebra')&&!data.some(b=>b.title==='Math')),'⋯ → Rename');
  // tags
  await more(A,'Algebra');await A.click('#pop >> text=Tags');await A.waitForSelector('#tg-in');
  await A.fill('#tg-in','school');await A.keyboard.press('Enter');await A.fill('#tg-in','#Exam ');await A.keyboard.press('Enter');await A.click('#lockd .btn:text("Save")');await A.waitForTimeout(400);
  ok(await A.evaluate(()=>JSON.stringify(data.find(b=>b.title==='Algebra').tags)==='["school","Exam"]'),'⋯ → Tags: two tags added (a “#” in front and spaces are cleaned up)');
  await more(A,'History');await A.click('#pop >> text=Tags');await A.waitForSelector('#tg-in');
  ok(await A.evaluate(()=>[...document.querySelectorAll('.tgpick .tg')].map(t=>t.textContent).join()==='Exam,school'),'the tags you already use are offered to pick');
  await A.click('.tgpick .tg:text("school")');await A.click('#lockd .btn:text("Save")');await A.waitForTimeout(400);
  ok(await A.evaluate(()=>[...document.querySelectorAll('#tagrow .tg')].map(t=>t.textContent).join()==='Exam,school'&&document.querySelectorAll('.cw .tgs .tg').length===3),'the tag row above the shelf, and the tags under each notebook\'s name');
  await A.click('#tagrow .tg:text("Exam")');await A.waitForTimeout(300);
  ok(await shown(A)==='Algebra','tapping a tag shows only the notebooks with it');
  await A.click('#tagrow .tg-clr');await A.waitForTimeout(300);
  // tag colours: pick one before adding, change one later
  await more(A,'History');await A.click('#pop >> text=Tags');await A.waitForSelector('#tg-in');
  await A.fill('#tg-in','urgent');await A.click('.tgsw .tgsc[aria-label="Purple"]');
  ok(await A.evaluate(()=>$('.tgprev').style.getPropertyValue('--tc')==='#8a66d6'&&$('.tgprev').textContent==='urgent'&&$('.tgsw .tgsc[aria-label="Purple"]').getAttribute('aria-checked')==='true'),'a new tag: you pick its colour first and see how it looks before adding it (Purple)');
  await A.keyboard.press('Enter');await A.waitForTimeout(150);
  ok(await A.evaluate(()=>[...document.querySelectorAll('.tgpick .tg')].some(t=>t.textContent==='urgent'&&t.getAttribute('aria-pressed')==='true')),'… Enter adds it to the notebook');
  await A.click('.tgacts .tg-clr');await A.waitForSelector('.tgrow2');
  await A.click('.tgrow2:has(.tg:text-is("school")) .tgsc[aria-label="Teal"]');
  await A.click('#lockd .btn:text("Save")');await A.waitForTimeout(400);
  ok(await A.evaluate(()=>SHELF.tc.urgent==='#8a66d6'&&SHELF.tc.school==='#2e9aa2'&&hasTag(data.find(b=>b.title==='History'),'urgent')),'"Change colours" changes an existing tag (school → Teal)');
  ok(await A.evaluate(()=>{const c=[...document.querySelectorAll('.cw .tgs .tg')].filter(t=>t.textContent==='school');return c.length===2&&c.every(t=>t.style.getPropertyValue('--tc')==='#2e9aa2')}),'… on every notebook with that tag');
  // your own order: drag a notebook
  await A.evaluate(()=>{LIB.sort='rec';saveLib();$('#sortb').value='rec';renderShelf()});
  const before=await shown(A);const list=before.split(', ');
  await drag(A,await cellBox(A,list[list.length-1]),(await cellBox(A,list[0])).x+12,(await cellBox(A,list[0])).y+60);
  const after=await shown(A);
  ok(after.split(', ')[0]===list[list.length-1]&&await A.evaluate(()=>LIB.sort==='own'&&$('#sortb').value==='own'),'dragging the last notebook to the front puts it first and turns on "My order" ('+before+' → '+after+')');
  ok(await A.evaluate(()=>!cur&&$('#bv').classList.contains('hidden')),'… and the drag doesn\'t open it');
  await reload(A);
  ok(await shown(A)===after,'the order stays after a restart');
  const l2=after.split(', ');await more(A,l2[0]);await A.click('#pop >> text=Move later');await A.waitForTimeout(400);
  ok((await shown(A)).split(', ')[1]===l2[0],'⋯ → Move later moves it one place');
  ok(await A.evaluate(()=>JSON.stringify(data.find(b=>b.title==='Algebra').tags)==='["school","Exam"]'),'tags stay after a restart');
  await more(A,'History');await A.click('#pop >> text=Move to category');await A.waitForTimeout(300);
  ok(await A.evaluate(()=>!$('#up').classList.contains('hidden')),'free plan: ⋯ → Move to category explains Pro');
  await A.evaluate(()=>$('#up').classList.add('hidden'));
  await more(A,'History');await A.click('#pop >> text=Delete');await A.waitForSelector('#lockd .btn.danger');
  ok(await A.evaluate(()=>/Recently deleted/.test($('#lockd').textContent)&&/2 days/.test($('#lockd').textContent)),'⋯ → Delete asks first and says it goes to Recently deleted (2 days on the free plan)');
  await A.click('#lockd .btn.danger');await A.waitForTimeout(500);
  ok(await A.evaluate(()=>!data.some(b=>b.title==='History')&&TRASH.some(t=>t.title==='History')),'… and moves it to Recently deleted');

  // ---- 2) Pro: categories, on two devices
  const C2=await ctxOf(),B=await open(C2,'B');await signUp(B,'bob8@example.com');
  const uid=await B.evaluate(()=>ACC.user.uid);
  await admin('pro/'+uid,{fields:{by:{stringValue:'admin'},since:{timestampValue:new Date().toISOString()},days:{integerValue:'0'}}});
  await B.waitForFunction(()=>ACC.pro,null,{timeout:15000});await B.waitForTimeout(500);
  ok(await B.evaluate(()=>!$('#catadd .soon')),'Pro: the "+" has no Pro badge');
  await B.click('#catadd');await B.waitForSelector('#nm-in');await B.fill('#nm-in','Study');await B.click('#lockd .btn:text("Create")');await B.waitForTimeout(400);
  ok(await tabs(B)==='Notebooks | Study'&&await B.evaluate(()=>catName(LIB.cat)==='Study'),'"+" → a new category "Study" becomes a tab, and opens');
  await newBook(B,'Physics');
  ok(await B.evaluate(()=>catName(catOf(data.find(b=>b.title==='Physics')))==='Study')&&await shown(B)==='Physics','a new notebook made in Study goes in Study');
  await B.click('#tb1');await B.waitForTimeout(300);
  ok(!(await shown(B)).includes('Physics'),'"Notebooks" doesn\'t show the notebooks in Study');
  await newBook(B,'Novel');await newBook(B,'Poems');await newBook(B,'Diary');
  const tabBox=await B.locator('#cats .cat[data-cat]:not(#tb1)').boundingBox();
  await drag(B,await cellBox(B,'Novel'),tabBox.x+tabBox.width/2,tabBox.y+tabBox.height/2);
  ok(await B.evaluate(()=>catName(catOf(data.find(b=>b.title==='Novel')))==='Study')&&!(await shown(B)).includes('Novel'),'dragging a notebook onto the Study tab moves it there');
  await more(B,'Poems');await B.click('#pop >> text=Move to category');await B.waitForTimeout(200);
  ok(await B.evaluate(()=>[...document.querySelectorAll('#pop .pop-i')].map(b=>b.textContent).join('|')==='Notebooks|Study|New category'),'⋯ → Move to category lists Notebooks, Study and "New category"');
  await B.click('#pop >> text=New category');await B.waitForSelector('#nm-in');await B.fill('#nm-in','Writing');await B.click('#lockd .btn:text("Create")');await B.waitForTimeout(400);
  ok(await tabs(B)==='Notebooks | Study | Writing'&&await B.evaluate(()=>catName(catOf(data.find(b=>b.title==='Poems')))==='Writing'&&catName(LIB.cat)==='Writing'),'"New category" from the menu makes "Writing" and puts Poems in it');
  // the category menu: rename, move, delete
  await B.click('#cats .cat:has-text("Writing")');await B.waitForSelector('#pop');
  ok(await B.evaluate(()=>['Rename','Move left','Move right','Delete category'].every(t=>[...document.querySelectorAll('#pop .pop-i')].some(b=>b.textContent===t))&&$('#pop .pop-i:nth-of-type(3)')),'tapping the open category shows its menu: Rename, Move left/right, Delete category');
  await B.click('#pop >> text=Move left');await B.waitForTimeout(300);
  ok(await tabs(B)==='Notebooks | Writing | Study','Move left: Writing comes before Study');
  await B.click('#cats .cat:has-text("Study")');await B.waitForTimeout(200);await B.click('#cats .cat:has-text("Study")');await B.waitForSelector('#pop');await B.click('#pop >> text=Rename');
  await B.fill('#nm-in','School');await B.click('#lockd .btn:text("Save")');await B.waitForTimeout(300);
  ok(await tabs(B)==='Notebooks | Writing | School','Rename: Study → School');
  await B.click('#tb1');await B.waitForTimeout(200);
  ok(await B.evaluate(()=>!document.querySelector('#tb1 .cat-more')),'"Notebooks" has no menu: it can\'t be renamed, moved or removed');
  await more(B,'Diary');await B.click('#pop >> text=Tags');await B.waitForSelector('#tg-in');await B.fill('#tg-in','private');await B.keyboard.press('Enter');await B.click('#lockd .btn:text("Save")');await B.waitForTimeout(300);
  ok(await B.evaluate(()=>[...document.querySelectorAll('#tagrow .tg')].map(t=>t.textContent).join()==='private'),'Notebooks can have tags too');
  await B.fill('#q','phys');await B.waitForTimeout(300);
  ok(await B.evaluate(()=>/Physics/.test($('#grid').textContent)&&/in School/.test($('#grid').textContent)),'search looks in every category and says where a notebook is ("in School")');
  await B.fill('#q','');await B.waitForTimeout(200);
  await reload(B);
  ok(await tabs(B)==='Notebooks | Writing | School','the categories stay after a restart');
  await settle(B);
  const man=async()=>{const r=await admin('users/'+uid,null,'GET');const j=await r.json();return (j.fields&&j.fields.m&&j.fields.m.mapValue.fields)||{}};
  ok(!!(await man()).shelf,'the categories are saved in the cloud (one small record)');

  // ---- 3) a second device: everything comes, and the pill at the top counts the notebooks
  const C3=await ctxOf(),B2=await open(C3,'B2');
  await B2.evaluate(()=>{SP.wait=0;window._pill=[];const p=$('#syncpill');new MutationObserver(()=>{const t=p.classList.contains('hidden')?'':p.textContent;if(t&&window._pill[window._pill.length-1]!==t)window._pill.push(t)}).observe(p,{subtree:true,childList:true,characterData:true,attributes:true})});
  await signIn(B2,'bob8@example.com');await B2.waitForFunction(()=>ACC.pro,null,{timeout:15000});
  await B2.waitForFunction(()=>data.some(b=>b.title==='Physics'),null,{timeout:30000});await B2.waitForFunction(()=>!ACC.busy,null,{timeout:30000});await B2.waitForTimeout(2200);
  const pill=await B2.evaluate(()=>window._pill);
  ok(pill.some(t=>/^Syncing \d+ of \d+ notebooks$/.test(t))&&pill.includes('All notebooks synced'),'the pill at the top: '+pill.slice(0,4).join(' → ')+(pill.length>4?' … ':' ')+'→ '+pill[pill.length-1]);
  ok(await B2.evaluate(()=>$('#syncpill').classList.contains('hidden')),'… and then it goes away by itself');
  await B2.evaluate(()=>{LIB.sort='own';renderShelf()});await B.evaluate(()=>{LIB.sort='own';renderShelf()});
  ok(await tabs(B2)==='Notebooks | Writing | School','device 2 has the same categories, in the same order');
  ok(await B2.evaluate(()=>['Physics','Novel'].every(t=>catName(catOf(data.find(b=>b.title===t)))==='School')&&catName(catOf(data.find(b=>b.title==='Poems')))==='Writing'&&JSON.stringify(data.find(b=>b.title==='Diary').tags)==='["private"]'&&!!(SHELF.tc||{}).private),'… every notebook in its category, with its tags');
  ok(await B2.evaluate(()=>JSON.stringify(SHELF.tc))===await B.evaluate(()=>JSON.stringify(SHELF.tc)),'… and the same tag colours');
  ok(await B2.evaluate(()=>data.map(b=>b.title).join())===await B.evaluate(()=>data.map(b=>b.title).join()),'… and in the same order');
  // both devices add a category at the same time: both are kept
  await B.evaluate(()=>{SHELF.cats.push({id:'cart',n:'Art',u:Date.now()});SHELF.u=Date.now();persist();renderShelf()});
  await B2.evaluate(()=>{SHELF.cats.push({id:'cmus',n:'Music',u:Date.now()});SHELF.u=Date.now();persist();renderShelf()});
  await settle(B);await settle(B2);await settle(B);
  ok(await tabs(B)===await tabs(B2)&&/Art/.test(await tabs(B))&&/Music/.test(await tabs(B)),'two devices add a category at the same time: both are kept ('+await tabs(B)+')');
  // a category deleted on one device is gone on the other, its notebooks back in Notebooks
  await B2.click('#cats .cat:has-text("Writing")');await B2.waitForTimeout(200);await B2.click('#cats .cat:has-text("Writing")');await B2.waitForSelector('#pop');await B2.click('#pop >> text=Delete category');
  await B2.waitForSelector('#lockd .btn.danger');ok(await B2.evaluate(()=>/No notebook is deleted/.test($('#lockd').textContent)),'deleting a category says that no notebook is deleted');
  await B2.click('#lockd .btn.danger');await B2.waitForTimeout(400);
  ok(await B2.evaluate(()=>!/Writing/.test([...document.querySelectorAll('#cats .cat')].map(t=>t.textContent).join())&&catOf(data.find(b=>b.title==='Poems'))===''),'… Poems is back in Notebooks');
  await settle(B2);await settle(B);
  ok(!/Writing/.test(await tabs(B))&&await B.evaluate(()=>catOf(data.find(b=>b.title==='Poems'))===''&&data.some(b=>b.title==='Poems')),'on the other device too (and Poems is still there)');
  // an older version of the app could remove the categories record from the cloud: it is sent again, nothing is lost
  const sid='users/'+uid+'/r/shelf';await admin(sid,null,'DELETE');
  await fetch(DB+'/users/'+uid+'?updateMask.fieldPaths=m.shelf',{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{}})});
  await B.waitForTimeout(800);await settle(B);
  ok(/School/.test(await tabs(B))&&!!(await man()).shelf,'if the cloud copy of the categories disappears, the device keeps them and sends them again');
  // backup includes the categories
  const bk=await B.evaluate(async()=>{let out='';const sf=window.saveFile;window.saveFile=async(n,blob)=>{out=await blob.text();return true};try{await backupAll()}finally{window.saveFile=sf}return out});
  ok(JSON.parse(bk).shelf.cats.some(c=>c.n==='School'&&!c.x),'a backup file has the categories too');

  // ---- 4) on a phone: hold a notebook, then drag
  const C4=await b.newContext({viewport:{width:412,height:860},isMobile:true,hasTouch:true,deviceScaleFactor:1});await C4.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await C4.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());
  const P=await C4.newPage();P.errs=[];P.on('pageerror',e=>P.errs.push('P: '+e.message));await P.goto(URL0);await signUp(P,'phone8@example.com');
  await newBook(P,'One');await newBook(P,'Two');await P.evaluate(()=>{LIB.sort='own';$('#sortb').value='own';renderShelf()});await P.waitForTimeout(300);
  const cdp=await C4.newCDPSession(P),touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
  const p0=await shown(P),last=p0.split(', ').pop(),first=p0.split(', ')[0];
  const t1=await cellBox(P,last),t0=await cellBox(P,first);
  await touch('touchStart',t1.x+t1.width/2,t1.y+t1.height/3);await P.waitForTimeout(520);
  for(let i=1;i<=14;i++){await touch('touchMove',t1.x+t1.width/2+(t0.x+12-t1.x-t1.width/2)*i/14,t1.y+t1.height/3+(t0.y+40-t1.y-t1.height/3)*i/14);await P.waitForTimeout(25)}
  await P.waitForTimeout(450);await touch('touchEnd');await P.waitForTimeout(500);
  ok((await shown(P)).split(', ')[0]===last,'phone: hold a notebook a moment, then drag it to a new place ('+p0+' → '+await shown(P)+')');
  const t2=await cellBox(P,first);await touch('touchStart',t2.x+t2.width/2,t2.y+t2.height/2);await P.waitForTimeout(700);await touch('touchEnd');await P.waitForTimeout(400);
  ok(await P.evaluate(()=>!!$('#pop')&&$('#bv').classList.contains('hidden')),'phone: holding a notebook without moving opens its ⋯ menu');

  [...A.errs,...B.errs,...B2.errs,...P.errs].forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
