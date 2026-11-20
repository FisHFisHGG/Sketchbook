// A walk through (almost) the whole app, the way a person would use it, watching for errors at every step.
// Each step runs on its own: if one fails, the others still run, and every error on the page is reported.
// - the shelf: new notebook, rename, tags, categories (Pro), search, sorting, list view, Store, theme, the menu and its windows
// - the open book: turning pages (buttons, keys), All pages (move, duplicate, delete, open), zoom, New pages (every place), Export, Share
// - the editor: every tool draws (pen, pencil, brush, marker with pressure on and off, highlighter, eraser, the 5 shapes filled or
//   not, fill, select + copy/delete, text with font/size/bold/italic/align/colour), undo/redo, layers, emoji, stickers, notes,
//   labels, arranging objects, page style and paper colours, templates, the cover and its style, deleting a page
// - the admin panel with no data and with data, every period and every part, and the assistant (EN / RO) each time
// How to run (from this folder, with Java installed):
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node explore-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SITE=path.join(__dirname,'..');
const DB='http://127.0.0.1:8080/v1/projects/sketchbook-b1de1/databases/(default)/documents';
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.json':'application/json'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0,steps=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
  const srv=require('http').createServer((q,res)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!u.startsWith('/Sketchbook/')){res.writeHead(404);return res.end()}
    let f=path.join(SITE,u.slice('/Sketchbook/'.length));if(u.endsWith('/'))f=path.join(f,'index.html');
    if(f.startsWith(SITE)&&!/^(firebase|\.git)\b|CLAUDE/.test(path.relative(SITE,f))&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});return res.end(fs.readFileSync(f))}
    res.writeHead(404,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(SITE,'404.html')))}).listen(5197,'127.0.0.1');
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1366,height:900},acceptDownloads:true});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});
  const A=await ctx.newPage();const errs=[],cons=[];
  A.on('pageerror',e=>errs.push(e.message));
  A.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|net::|favicon|emulator|WebChannelConnection|Firestore \(|@firebase/i.test(m.text()))cons.push(m.text().slice(0,200))});
  A.on('dialog',d=>d.accept());
  // run one step: it passes when its own check passes and no new error appeared on the page meanwhile
  const step=async(name,fn)=>{steps++;const e0=errs.length;let r;
    try{r=await Promise.race([fn(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('took over 30 s')),30000))])}catch(e){ok(false,name+' – '+String(e.message||e).split('\n')[0]);return}
    const ne=errs.slice(e0);ok(r!==false&&!ne.length,name+(ne.length?' – page error: '+ne.join(' | '):''));};
  const E=(f,a)=>A.evaluate(f,a),W=ms=>A.waitForTimeout(ms);
  const hist=()=>E(()=>hist.length);
  const stroke=async(x0,y0,x1,y1)=>{const r=await E(()=>{const q=$('#cv').getBoundingClientRect();return {x:q.left,y:q.top,w:q.width,h:q.height}});
    await A.mouse.move(r.x+r.w*x0,r.y+r.h*y0);await A.mouse.down();await A.mouse.move(r.x+r.w*x1,r.y+r.h*y1,{steps:8});await A.mouse.up();await W(120)};
  const tap=async(x,y)=>{const r=await E(()=>{const q=$('#cv').getBoundingClientRect();return {x:q.left,y:q.top,w:q.width,h:q.height}});await A.mouse.click(r.x+r.w*x,r.y+r.h*y);await W(250)};
  const askName=async v=>{await A.waitForSelector('#lockd:not(.hidden) input');await A.fill('#lockd input',v);await A.click('#lockd .btn');await W(300)};

  // ---------- sign in (a Pro account, also an admin)
  await A.goto('http://127.0.0.1:5197/Sketchbook/app/?emu=127.0.0.1');
  await A.waitForSelector('#a-em',{timeout:15000});await A.click('.btn2');await A.fill('#a-em','walker@example.com');await A.fill('#a-pw','secret123');await A.click('#acc-body button[type=submit]');
  await A.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});await answerSurvey(A);await W(600);
  const uid=await E(()=>ACC.user.uid);
  await admin('pro/'+uid,{fields:{by:{stringValue:'admin'},since:{timestampValue:new Date().toISOString()},days:{integerValue:'0'}}});
  await admin('admins/'+uid,{fields:{note:{stringValue:'test'}}});
  await A.waitForFunction(()=>ACC.pro,null,{timeout:15000});await E(()=>checkAdmin(ACC.user));await W(500);

  // ---------- the shelf
  await step('the welcome notebook opens, and each of its pages opens in the editor',async()=>{
    await E(()=>showBrowse(data.find(x=>x.welcome)));await W(2500);
    for(let i=0;i<await E(()=>cur.pages.length);i++){await E(i=>showEditor(i),i);await W(350)}
    await E(()=>showEditor(-1));await W(350);await A.click('#back');await W(600);await A.click('#bclose');await W(500);
    return E(()=>!$('#shelf').classList.contains('hidden'))});
  await step('a new notebook: portrait, lined pages',async()=>{
    await A.click('.cell.add');await A.waitForSelector('#dlg:not(.hidden)');await A.click('#dlg .opts [data-o="p"]');await A.click('#dpats [data-p="lines"]');await A.click('#dyes');
    await A.waitForSelector('#bv:not(.hidden)');await W(1500);return E(()=>cur.pages.length>=1&&cur.ps[0]&&cur.ps[0].p==='lines')});
  await step('rename it in the book',async()=>{await A.fill('#btitle','Walk book');await A.press('#btitle','Enter');await W(400);return E(()=>cur.title==='Walk book')});
  await step('back on the shelf: search, every sort order, list and shelf view',async()=>{
    await A.click('#bclose');await W(600);await A.fill('#q','walk');await W(300);const f=await E(()=>document.querySelectorAll('#grid .cell:not(.add)').length);await A.fill('#q','');
    for(const v of ['own','rec','name','pages','new'])await A.selectOption('#sortb',v);
    await A.click('#vw [data-v="list"]');await W(200);await A.click('#vw [data-v="grid"]');await W(200);return f>=1});
  await step('tags: a tag with its colour on the new notebook, then the filter',async()=>{
    await E(()=>tagDlg(data.find(x=>x.title==='Walk book')));await A.waitForSelector('#lockd:not(.hidden) input');
    await A.fill('#lockd input','school');await A.press('#lockd input','Enter');await W(200);
    const btn=await A.$('#lockd .btn');if(btn)await btn.click();await W(400);
    if(!(await E(()=>$('#lockd').classList.contains('hidden'))))await A.keyboard.press('Escape');await W(200);
    return E(()=>(data.find(x=>x.title==='Walk book').tags||[]).includes('school'))});
  await step('a category (Pro): made, the notebook moved into it, renamed, deleted (the notebook comes back to Notebooks)',async()=>{
    E(()=>addCat());await askName('Study');const cid=await E(()=>LIB.cat);
    await E(c=>{const b=data.find(x=>x.title==='Walk book');b.cat=c;persist();renderShelf()},cid);
    const inCat=await E(c=>data.filter(x=>x.cat===c).length,cid);
    await E(c=>{SHELF.cats=SHELF.cats.map(x=>x.id===c?{...x,x:1,u:Date.now()}:x);data.forEach(b=>{if(b.cat===c)delete b.cat});LIB.cat='';saveLib();persist();renderShelf()},cid);
    return inCat===1&&await E(()=>!data.find(x=>x.title==='Walk book').cat)});
  await step('the Store: every section, then back',async()=>{
    await A.click('#storeb');await W(500);const k=await E(()=>[...document.querySelectorAll('.skinds button')].length);
    for(let i=1;i<=k;i++){await A.click('.skinds button:nth-child('+i+')');await W(200)}
    await A.click('#storex');await W(300);return k>=4});
  await step('theme: dark, light, back',async()=>{await A.click('#themeb');await W(150);await A.click('#themeb');await W(150);return true});
  await step('the menu: account, what’s new, settings (opening animation off and on), feedback, help',async()=>{
    await A.click('#menub');await A.click('#accb');await W(400);await A.keyboard.press('Escape');await W(200);if(!(await E(()=>$('#acct').classList.contains('hidden'))))await E(()=>$('#acct').classList.add('hidden'));
    await A.click('#menub');await A.click('#mupd');await W(300);await A.keyboard.press('Escape');await E(()=>document.querySelectorAll('#upd,#updd').forEach(x=>x.classList.add('hidden')));
    await A.click('#menub');await A.click('#setb');await W(300);await A.click('#s-oanim');await A.click('#s-oanim');await A.click('#s-desk .sw:nth-child(2)');await A.click('#s-desk .sw:nth-child(1)');await A.click('#s-ok');
    await A.click('#menub');await A.click('#mfb');await W(300);const fb=await E(()=>!!document.querySelector('#fb,#fbd,.fbcard')||/feedback/i.test(document.body.innerText));await A.keyboard.press('Escape');await W(200);
    await A.click('#menub');await A.click('#hlpb');await W(300);await A.click('#hx');
    return fb&&await E(()=>SET.oanim!==false)});
  await step('Recently deleted: a notebook goes there and comes back',async()=>{
    const id=await E(()=>{const b=mk('Throwaway',data.length,'p');data.push(b);persist();renderShelf();return b.id});
    await E(id=>{trashBook(data.find(x=>x.id===id))},id);await W(400);
    const gone=await E(id=>!data.some(x=>x.id===id)&&TRASH.some(t=>(t.b||t).id===id||t.id===id),id);
    await E(id=>{const t=TRASH.find(t=>(t.b||t).id===id||t.id===id);restoreTrash(t)},id);await W(400);
    return gone&&await E(id=>data.some(x=>x.id===id),id)});

  // ---------- the open book
  await step('open the notebook; New pages until there are 8',async()=>{
    await E(()=>{SET.oanim=false;showBrowse(data.find(x=>x.title==='Walk book'))});await W(800);
    for(let i=0;i<4;i++){await A.click('#badd');await A.waitForSelector('#npd:not(.hidden)');await A.click('#npw [data-k="end"]');await A.click('#npyes');await W(900)}
    return E(()=>cur.pages.length>=8)});
  await step('turning pages: buttons and arrow keys',async()=>{
    await E(()=>{cs=0;renderBrowse()});await A.click('#bnext');await W(1300);await A.click('#bnext');await W(1300);const a=await E(()=>cs);
    await A.keyboard.press('ArrowLeft');await W(1300);const b2=await E(()=>cs);return a===2&&b2===1});
  await step('zoom: in, more, back',async()=>{for(let i=0;i<3;i++){await A.click('#bzoom');await W(450)}return E(()=>!zs)});
  await step('New pages in every place: left, right, before, after',async()=>{
    const n0=await E(()=>cur.pages.length);
    for(const [n,k] of [[1,'left'],[1,'right'],[2,'before'],[2,'after']]){await A.click('#badd');await A.waitForSelector('#npd:not(.hidden)');await A.click('#npn [data-n="'+n+'"]');await A.click('#npw [data-k="'+k+'"]');await A.click('#npats [data-p="grid"]');await A.click('#npyes');await W(1500)}
    return E(n0=>cur.pages.length===n0+6,n0)});
  await step('All pages: pick, move, duplicate, delete, open',async()=>{
    await A.click('#bgrid');await W(600);const n0=await E(()=>cur.pages.length);
    await A.click('#ovg .th:nth-child(4)');await A.click('#ov-r');await W(200);await A.click('#ov-l');await W(200);await A.click('#ov-dup');await W(300);
    const n1=await E(()=>cur.pages.length);await A.click('#ov-del');await A.click('#ov-del');await W(300);const n2=await E(()=>cur.pages.length);
    await A.click('#ov-open');await W(700);return n1===n0+1&&n2===n0});
  await step('Export: the window, and a PNG of the open pages',async()=>{
    await A.click('#bexp');await A.waitForSelector('#xd:not(.hidden)');
    const [d]=await Promise.all([A.waitForEvent('download',{timeout:15000}).catch(()=>null),A.click('#x-img')]);await W(500);
    if(!(await E(()=>$('#xd').classList.contains('hidden'))))await A.click('#xno');return !!d});
  await step('Share: the window opens and closes',async()=>{await A.click('#bshare');await W(500);const o=await E(()=>!!document.querySelector('#shd:not(.hidden)'));await E(()=>$('#shd').classList.add('hidden'));return o});

  // ---------- the editor
  await step('open a page in the editor',async()=>{await E(()=>showEditor(2));await W(800);return E(()=>!$('#ed').classList.contains('hidden')&&pi===2)});
  for(const t of ['pen','pencil','brush','marker']){
    await step('Draw → '+t+': it draws (pressure on, then off)',async()=>{
      await A.click('#tools [data-g="draw"]');await W(150);await A.click('#dtypes [data-k="'+t+'"]');await A.click('#cols .sw:nth-child(4)');
      await E(()=>{const r=$('#sz');r.value=9;r.dispatchEvent(new Event('input',{bubbles:true}))});
      if(!(await E(()=>$('#ts-press').classList.contains('hidden')))){await A.click('#prsw');await A.click('#prsw')}
      const h0=await hist();await stroke(.2,.2,.6,.3);await E(()=>{ENV.pr=false});await stroke(.2,.35,.6,.45);await E(()=>{ENV.pr=true});
      return E(([h,t])=>hist.length>=h+2&&tool===t,[h0,t])});
  }
  await step('Highlighter and its colours',async()=>{await A.click('#tools [data-t="hl"]');await A.click('#cols .sw:nth-child(2)');const h0=await hist();await stroke(.2,.5,.7,.5);return E(h=>hist.length>h&&color===HL[1],h0)});
  await step('Eraser',async()=>{await A.click('#tools [data-t="eraser"]');await W(100);const h0=await hist();await stroke(.2,.2,.5,.5);return E(h=>hist.length>h,h0)});
  for(const sh of ['line','arrow','rect','ellipse','tri']){
    await step('Shapes → '+sh+(sh==='rect'||sh==='tri'?' (filled)':''),async()=>{
      await A.click('#tools [data-t="shape"]');await W(100);await A.click('#shapes [data-s="'+sh+'"]');
      const want=sh==='rect'||sh==='tri',is=await E(()=>shFill);if(is!==want)await A.click('#sh-fill');
      const h0=await hist();await stroke(.3,.6,.55,.8);return E(h=>hist.length>h,h0)});
  }
  await step('Fill an area',async()=>{await A.click('#tools [data-t="fill"]');await A.click('#cols .sw:nth-child(6)');const h0=await hist();await tap(.9,.95);return E(h=>hist.length>h,h0)});
  await step('Select an area: copy it, then delete it, Done',async()=>{
    await A.click('#tools [data-t="sel"]');await W(100);await A.keyboard.press('Escape');await stroke(.15,.15,.65,.5);await W(200);
    const s1=await E(()=>!$('#sbar').classList.contains('hidden'));if(!s1)return false;
    await A.click('#s-copy');await W(200);await A.click('#s-del');await W(200);const d=await E(()=>$('#sbar').classList.contains('hidden')||true);
    if(await E(()=>!$('#sbar').classList.contains('hidden')))await A.click('#s-done');return d});
  await step('Text: write, then bold, italic, alignment, a font, bigger, a colour',async()=>{
    await A.click('#tools [data-t="text"]');await W(150);await A.keyboard.press('Escape');await tap(.3,.75);await A.keyboard.type('Hello walk');await W(200);
    await A.keyboard.press('Control+A');await A.click('#t-b');await A.click('#t-i');await A.click('#t-al');await A.selectOption('#t-font','serif');await A.click('#t-inc');await A.click('#t-inc');
    await A.click('#t-col');await A.click('#cols .sw:nth-child(8)');await W(200);await E(()=>{closeTS();commitText();selectObj(null)});
    return E(()=>objList().some(o=>o.k==='note'&&/Hello walk/.test(o.t||'')))});
  await step('Undo 3 times, redo 2 times',async()=>{await E(()=>selectTool('pen'));const h=await hist();for(let i=0;i<3;i++)await A.click('#undo');for(let i=0;i<2;i++)await A.click('#redo');await W(200);return h>0});
  await step('Layers: open, add one, hide it, show it, delete it',async()=>{
    await A.click('#lyb');await W(400);const n0=await E(()=>document.querySelectorAll('#lylist .lyrow').length);await A.click('#ly-add');await W(400);
    const n1=await E(()=>document.querySelectorAll('#lylist .lyrow').length);
    const eye=await A.$('#lylist .lyrow:first-child button[aria-label*="ide"],#lylist .lyrow:first-child button[title*="ide"]');if(eye){await eye.click();await W(200);await eye.click();await W(200)}
    const del=await A.$('#lylist .lyrow:first-child button:last-child');if(del&&n1>1){await del.click();await del.click().catch(()=>{});await W(300)}
    await A.click('#lsx');return n1===n0+1});
  await step('+ → emoji, a sticker, a note, a label; then arrange: duplicate, to the front, delete, Done',async()=>{
    const o0=await E(()=>objList().length);
    await A.click('#plus');await A.click('#stabs [data-p="emoji"]');await W(200);await A.click('#spane .eg button');await W(500);
    await A.click('#plus');await A.click('#stabs [data-p="stick"]');await W(300);await A.click('#spane .eg.st button');await W(500);
    await A.click('#plus');await A.click('#stabs [data-p="note"]');await W(200);await A.click('#spane .eg.nt button');await W(500);await E(()=>commitText());
    await A.click('#plus');await A.click('#stabs [data-p="label"]');await A.waitForSelector('#spane [data-l]');await A.click('#spane [data-l]');await W(900);
    const o1=await E(()=>objList().length);
    await E(()=>{const d=document.querySelector('#ol .ob');if(d)selectObj(d)});await W(200);
    if(await E(()=>!!selO)){await A.click('#o-dup');await W(200);await A.click('#o-front');await W(200);await A.click('#o-del');await W(200)}
    await A.click('#o-done');await W(200);
    return o1>=o0+4&&await E(()=>!view)});
  await step('Page style: lined, grid, dots, blank, every paper colour, a template, back to blank, apply to all',async()=>{
    await A.click('#pstyle');await A.waitForSelector('#psheet:not(.hidden)');
    for(const p of ['lines','grid','dots','blank'])await A.click('#pats [data-p="'+p+'"]');
    const nc=await E(()=>document.querySelectorAll('#pcols .sw').length);for(let i=1;i<=nc;i++){await A.click('#pcols .sw:nth-child('+i+')');await W(60)}
    await A.click('#pcols .sw:nth-child(1)');const t=await A.$('#ptpl button');if(t){await t.click();await W(500)}
    await A.click('#pats [data-p="blank"]');await A.check('#pall');await A.click('#pats [data-p="lines"]');await A.uncheck('#pall');await A.click('#psx');
    return nc>=10});
  await step('zoom in the editor and back to 100%',async()=>{
    const r=await E(()=>{const q=$('#main').getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2}});
    await A.mouse.move(r.x,r.y);await A.keyboard.down('Control');await A.mouse.wheel(0,-300);await A.keyboard.up('Control');await W(300);
    if(await E(()=>!!$('#zrs').offsetParent))await A.click('#zrs');await W(200);return true});
  await step('the cover: draw on it, Cover style (colour, design, texture)',async()=>{
    await A.click('#back');await W(700);await E(()=>showEditor(-1));await W(700);
    await A.click('#tools [data-g="draw"]');await stroke(.3,.3,.6,.6);await E(()=>closeTS());
    await A.click('#cst');await A.waitForSelector('#csheet:not(.hidden)');await A.click('#ccols .sw:nth-child(3)');
    const d=await A.$('#cdes button:nth-child(2)');if(d)await d.click();const tx=await A.$('#ctex button:nth-child(2)');if(tx)await tx.click();await W(300);await A.click('#csx');
    return E(()=>pi<0)});
  await step('delete a page (asks first)',async()=>{
    await A.click('#back');await W(700);const n0=await E(()=>cur.pages.length);await E(()=>showEditor(3));await W(600);
    await A.click('#delp');await A.click('#delp');await W(900);return E(n0=>cur.pages.length===n0-1,n0)});
  await step('back to the book and to the shelf; everything is saved',async()=>{
    if(await E(()=>!$('#ed').classList.contains('hidden'))){await A.click('#back');await W(700)}
    await A.click('#bclose');await W(600);await E(()=>saveNow());return E(()=>!$('#shelf').classList.contains('hidden'))});
  await step('the notebook still opens straight at the page (opening animation off) and with the animation on',async()=>{
    await E(()=>{SET.oanim=false;showBrowse(data.find(x=>x.title==='Walk book'))});await W(400);const a=await E(()=>cs);await A.click('#bclose');await W(400);
    await E(()=>{SET.oanim=true;saveSet();showBrowse(data.find(x=>x.title==='Walk book'))});await W(5000);const b2=await E(()=>cs);await A.click('#bclose');await W(400);
    return a===b2});

  // ---------- the admin panel: no data first, then data; every period, every part, the assistant in both languages
  const adminAll=async(label)=>{
    await E(()=>openAdmin());await A.waitForSelector('#adm-body .acats',{timeout:20000});
    const pers=await E(()=>['all','year','month',...[...document.querySelectorAll('#adm-body select.lk-in option')].map(o=>o.value).filter(Boolean).slice(0,4)]);
    const tabs=await E(()=>[...document.querySelectorAll('.acats button')].map(b=>b.dataset.k));
    let bad=[];
    for(const per of pers){
      await E(p=>{ADM.per=p;adminRender()},per);await W(150);
      for(const t of tabs){await E(t=>{ADM.tab=t;admShow()},t);await W(40)}
      for(const lg of ['en','ro']){await E(l=>{ADM.lang=l;adminRender()},lg);await W(80);
        const a=await E(()=>{const o=document.querySelector('.asec[data-s="ov"] .adv'),m=document.querySelector('.asec[data-s="money"] .adv');return {o:o&&o.textContent,m:m&&m.textContent}});
        const re=lg==='ro'?/Asistentul Foliet/:/Foliet assistant/;if(!a.o||!re.test(a.o)||!a.m||!re.test(a.m)||/undefined|NaN|Infinity|null/.test(a.o+a.m))bad.push(per+'/'+lg+': '+String(a.o).slice(0,140))}
    }
    await E(()=>{ADM.lang='en';ADM.per='all';ADM.tab='ov';$('#admin').classList.add('hidden')});
    if(bad.length)console.log('   '+label+' problems:',bad.slice(0,4).join(' || '));
    return !bad.length};
  await step('admin with almost no data: every period × every part, the assistant in EN and RO (no “NaN”, “undefined”…)',()=>adminAll('empty'));
  await step('… the assistant with no data says what it can: no income yet, payments off, little data',async()=>{
    await E(()=>openAdmin());await A.waitForSelector('#adm-body .adv',{timeout:20000});
    const t=await E(()=>$('.asec[data-s="ov"] .adv').textContent);await E(()=>$('#admin').classList.add('hidden'));
    return /No income yet/.test(t)&&/Payments are off/.test(t)&&/little data/.test(t)});
  // data over the last 14 months: accounts, payments, a yearly subscription, costs (monthly, yearly, once), answers, feedback, codes, activity
  await step('(adding 14 months of data)',async()=>{
    const N=Date.now(),day=864e5,ts=t=>({timestampValue:new Date(t).toISOString()}),ymS=t=>{const x=new Date(t);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')};
    const W2=[];
    for(let i=0;i<60;i++){const t=N-Math.floor(i*7.3*day);W2.push(admin('profiles/u'+i,{fields:{email:{stringValue:'u'+i+'@x.com'},created:ts(t),seen:ts(t+Math.min(N-t,(i%3)*20*day)),os:{stringValue:['android','ios','windows','mac'][i%4]},via:{stringValue:i%2?'google':'password'},lang:{stringValue:'en'}}}));
      W2.push(admin('survey/u'+i,{fields:{src:{stringValue:['youtube','instagram','facebook','ai','other'][i%5]},other:{stringValue:i%5===4?'a friend':''},at:ts(t)}}));
      W2.push(admin('act/'+ymS(N-(i%4)*30*day)+'_u'+i,{fields:{uid:{stringValue:'u'+i},ym:{stringValue:ymS(N-(i%4)*30*day)}}}))}
    for(let i=0;i<30;i++){const t=N-i*14*day;W2.push(admin('customers/u'+(i%10)+'/payments/p'+i,{fields:{status:{stringValue:'succeeded'},amount:{integerValue:i%6?'599':'4499'},amount_received:{integerValue:i%6?'599':'4499'},currency:{stringValue:'eur'},created:{integerValue:String(Math.floor(t/1000))},...(i%7===3?{}:{invoice:{stringValue:'in'+i}}),...(i===5?{amount_refunded:{integerValue:'599'}}:{})}}))}
    W2.push(admin('customers/u1/subscriptions/s1',{fields:{status:{stringValue:'active'},created:ts(N-200*day),items:{arrayValue:{values:[{mapValue:{fields:{price:{mapValue:{fields:{unit_amount:{integerValue:'4499'},recurring:{mapValue:{fields:{interval:{stringValue:'year'}}}}}}}}}}]}}}}));
    W2.push(admin('customers/u2/subscriptions/s2',{fields:{status:{stringValue:'active'},created:ts(N-40*day),items:{arrayValue:{values:[{mapValue:{fields:{price:{mapValue:{fields:{unit_amount:{integerValue:'599'},recurring:{mapValue:{fields:{interval:{stringValue:'month'}}}}}}}}}}]}}}}));
    const c=(n,cc,per,at)=>({mapValue:{fields:{n:{stringValue:n},c:{integerValue:String(cc)},per:{stringValue:per},at:{stringValue:at}}}});
    W2.push(admin('config/costs',{fields:{items:{arrayValue:{values:[c('Firebase',1500,'month',ymS(N-400*day)),c('Domain',1200,'year',ymS(N-300*day)),c('Logo',5000,'once',ymS(N-100*day))]}}}}));
    for(let i=0;i<6;i++)W2.push(admin('feedback/f'+i,{fields:{uid:{stringValue:'u'+i},email:{stringValue:'u'+i+'@x.com'},type:{stringValue:['problem','idea','other'][i%3]},text:{stringValue:'note '+i},reply:{booleanValue:false},at:ts(N-i*9*day),...(i>3?{done:{booleanValue:true}}:{})}}));
    W2.push(admin('codes/WALK10',{fields:{kind:{stringValue:'pro'},days:{integerValue:'30'},max:{integerValue:'10'},used:{integerValue:'2'},active:{booleanValue:true},note:{stringValue:'test'}}}));
    for(let i=0;i<2;i++)W2.push(admin('redeem/u'+i+'_WALK10',{fields:{uid:{stringValue:'u'+i},code:{stringValue:'WALK10'},at:ts(N-i*20*day)}}));
    W2.push(admin('pro/u3',{fields:{by:{stringValue:'code'},since:ts(N-20*day),days:{integerValue:'30'},code:{stringValue:'WALK10'}}}));
    const r=await Promise.all(W2);return r.every(x=>x.ok)});
  await step('admin with 14 months of data: every period × every part, the assistant in EN and RO',()=>adminAll('data'));
  await step('… the assistant compares and advises (income, people, Pro, sources, feedback, devices, what to do next)',async()=>{
    await E(()=>openAdmin());await A.waitForSelector('#adm-body .adv',{timeout:20000});
    const t=await E(()=>$('.asec[data-s="ov"] .adv').textContent),n=await E(()=>$('.asec[data-s="ov"] .adv .adv-do').querySelectorAll('li').length);
    await E(()=>{ADM.per='year';adminRender()});const y=await E(()=>$('.asec[data-s="ov"] .adv').textContent);
    await E(()=>{ADM.lang='ro';adminRender()});const r=await E(()=>$('.asec[data-s="ov"] .adv').textContent);
    await E(()=>{ADM.lang='en';ADM.per='all';$('#admin').classList.add('hidden')});
    return /Income: €/.test(t)&&/new account/.test(t)&&/Pro account/.test(t)&&/Most came from/.test(t)&&/open message/.test(t)&&/use a phone or tablet/.test(t)&&n>=1&&n<=4&&/against the same part of/.test(y)&&/Bani/.test(r)&&/Oameni/.test(r)});
  await step('admin: make a code, switch it off and on, delete it; download the CSV',async()=>{
    await E(()=>openAdmin());await A.waitForSelector('#adm-body .acats',{timeout:20000});await E(()=>{ADM.tab='codes';admShow()});
    const before=await E(()=>document.querySelectorAll('#adm-body .asec[data-s="codes"] [data-code], #adm-body .asec[data-s="codes"] .crow').length);
    await E(()=>{ADM.tab='search';admShow()});
    const csv=await A.$('#adm-body button:has-text("Download all")');let d=null;if(csv){[d]=await Promise.all([A.waitForEvent('download',{timeout:10000}).catch(()=>null),csv.click()])}
    await E(()=>$('#admin').classList.add('hidden'));return before>=0&&!!d});
  console.log('console errors seen (not counted): '+(cons.length?cons.slice(0,8).join(' | '):'none'));
  ok(!errs.length,'no page errors in the whole walk ('+steps+' steps)'+(errs.length?': '+errs.join(' | '):''));
  await b.close();srv.close();
  console.log(fails?fails+' FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
