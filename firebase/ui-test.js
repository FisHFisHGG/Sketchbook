// Update 16 (the user's “update 9”): a cleaner notebook screen.
// - an open notebook and the page editor have no bars any more: only floating buttons (pills) at the top and the bottom
// - the drawing tools sit in one compact dock in the middle; tapping a tool picks it and opens its menu above it, with the
//   tool's name: Draw (pen, pencil, brush, marker) has color, size, opacity and pen pressure on/off; the highlighter, eraser,
//   shapes, fill, select and text each have their own menu; the menu closes when you draw on the page, with Escape or a
//   second tap on the tool
// - while writing, the text bar has a color button; + holds photos, stickers, emoji, notes and labels; Layers is at the top
// - everything fits on a computer, a tablet and a phone (no button off screen)
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node ui-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SITE=path.join(__dirname,'..');
const DB='http://127.0.0.1:8080/v1/projects/sketchbook-b1de1/databases/(default)/documents';
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.json':'application/json'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
  const srv=require('http').createServer((q,res)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!u.startsWith('/Sketchbook/')){res.writeHead(404);return res.end()}
    let f=path.join(SITE,u.slice('/Sketchbook/'.length));if(u.endsWith('/'))f=path.join(f,'index.html');
    if(f.startsWith(SITE)&&!/^(firebase|\.git)\b|CLAUDE/.test(path.relative(SITE,f))&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});return res.end(fs.readFileSync(f))}
    res.writeHead(404,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(SITE,'404.html')))}).listen(5196,'127.0.0.1');
  const b=await chromium.launch();let n=0;
  const URL0='http://127.0.0.1:5196/Sketchbook/app/?emu=127.0.0.1';
  const open=async(vp,o={})=>{
    const ctx=await b.newContext({viewport:vp,...o});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});
    const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto(URL0);
    await p.waitForSelector('#a-em',{timeout:15000});await p.click('.btn2');await p.fill('#a-em','ui'+(n++)+'_'+Date.now()%100000+'@example.com');await p.fill('#a-pw','secret123');
    await p.click('#acc-body button[type=submit]');await p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});await answerSurvey(p);await p.waitForTimeout(500);
    return p};
  // every visible button of a screen is inside the window
  const inside=(p,q)=>p.evaluate(q=>[...document.querySelectorAll(q)].filter(e=>e.offsetWidth&&getComputedStyle(e).visibility!=='hidden').every(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1}),q);
  const menu=p=>p.evaluate(()=>{const t=$('#tsheet'),vis=q=>{const e=$(q);return !!e&&!e.classList.contains('hidden')&&!!e.offsetParent};
    return {open:!t.classList.contains('hidden'),title:$('#tst').textContent,kind:vis('#ts-kind'),col:vis('#ts-col'),size:vis('#ts-size'),press:vis('#ts-press'),shape:vis('#ts-shape'),font:vis('#ts-font'),note:vis('#tsn')?$('#tsn').textContent:''}});

  // ---------- a computer
  const A=await open({width:1440,height:900});
  await A.evaluate(()=>showBrowse(data[0]));await A.waitForTimeout(1600);
  const barsBook=await A.evaluate(()=>[...document.querySelectorAll('#bv>.bar')].map(e=>{const c=getComputedStyle(e);return c.backgroundImage==='none'&&/rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor)&&c.borderTopWidth==='0px'&&c.borderBottomWidth==='0px'}));
  ok(barsBook.length===2&&barsBook.every(Boolean),'an open notebook: no bars at the top and bottom, only the buttons');
  ok(await A.evaluate(()=>['#bclose','#bshare','#badd','#bgrid'].every(q=>{const c=getComputedStyle($(q));return parseFloat(c.borderTopLeftRadius)>=18&&!!$(q).offsetWidth})),'… the buttons are floating pills and round buttons');
  ok(await inside(A,'#bv button,#bv input'),'… all of them inside the window');
  // Zoom: pressed, it stays visible (dark button, light icon)
  await A.click('#bzoom');await A.waitForTimeout(400);
  const zb=await A.evaluate(()=>{const c=getComputedStyle($('#bzoom'));return {p:$('#bzoom').getAttribute('aria-pressed'),bg:c.backgroundColor,fg:c.color}});
  ok(zb.p==='true'&&zb.bg!==zb.fg&&!/rgba\(0, 0, 0, 0\)/.test(zb.bg),'Zoom on: the button stays visible ('+zb.bg+' / '+zb.fg+')');
  await A.click('#bzoom');await A.click('#bzoom');await A.waitForTimeout(300);
  await A.evaluate(()=>showEditor(1));await A.waitForTimeout(900);
  const barsEd=await A.evaluate(()=>[...document.querySelectorAll('#ed>.bar')].map(e=>{const c=getComputedStyle(e);return c.backgroundImage==='none'&&/rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor)&&c.borderTopWidth==='0px'}));
  ok(barsEd.length===2&&barsEd.every(Boolean),'the page editor: no bars either');
  const dock=await A.evaluate(()=>{const r=$('#dock').getBoundingClientRect();return {c:Math.round(r.left+r.width/2),w:Math.round(r.width),tools:document.querySelectorAll('#tools button').length,plus:!!$('#dock #plus'),cols:!!$('#cols').offsetParent,sz:!!$('#sz').offsetParent,lyb:!!$('#ed>.bar #lyb')}});
  ok(Math.abs(dock.c-720)<=2&&dock.w<560&&dock.tools===7&&dock.plus,'the tools: one compact dock in the middle (7 tools + “+”, '+dock.w+' px wide)');
  ok(!dock.cols&&!dock.sz&&dock.lyb,'… colors and size are not on the screen until a menu opens; Layers is at the top');
  // Draw: the menu opens above the button, with the tool's name
  await A.click('#tools [data-g="draw"]');await A.waitForTimeout(250);
  let m=await menu(A);
  ok(m.open&&m.title==='Pen'&&m.kind&&m.col&&m.size&&m.press&&!m.shape&&!m.font,'tap Draw: its menu opens with “Pen”, the pen kinds, color, size and pen pressure');
  ok(await A.evaluate(()=>{const t=$('#tsheet').getBoundingClientRect(),d=$('#dock').getBoundingClientRect(),b=$('#tools [data-g="draw"]').getBoundingClientRect();return t.bottom<=d.top&&t.left<=b.left+b.width/2&&t.right>=b.left+b.width/2&&t.left>=0&&t.right<=innerWidth}),'… above the tools and over the Draw button, inside the window');
  await A.click('#dtypes [data-k="brush"]');await A.waitForTimeout(150);m=await menu(A);
  ok(await A.evaluate(()=>tool==='brush'&&$('#tools [data-g="draw"]').dataset.t==='brush'&&$('#tools [data-g="draw"]').getAttribute('aria-label')==='Draw: Brush')&&m.open&&m.title==='Brush','choose Brush in the menu: the brush is in use, the Draw button shows it, the menu says “Brush”');
  await A.click('#cols .sw:nth-child(8)');await A.waitForTimeout(100);
  ok(await A.evaluate(()=>color===INK[7]&&cmem.i===INK[7]&&$('#tools [data-g="draw"]').style.getPropertyValue('--c')===INK[7]),'pick a color: it’s used, and the line under Draw shows it');
  await A.evaluate(()=>{const r=$('#sz');r.value=12;r.dispatchEvent(new Event('input',{bubbles:true}))});
  ok(await A.evaluate(()=>size===12&&sizes.brush===12&&$('#szv').textContent==='12'),'size: the slider sets it and shows the number');
  const pr=await A.evaluate(()=>{const f={clientX:100,clientY:100,pointerType:'pen',pressure:.95};const on=pos(f).p;$('#prsw').click();const off=pos(f).p,st=JSON.parse(localStorage.getItem('sb-opt')).e.pr,hid=$('#prr').classList.contains('hidden');$('#prsw').click();return {on,off,st,hid,back:pos(f).p,sw:$('#prsw').getAttribute('aria-checked')}});
  ok(pr.on>.5&&pr.off===.5&&pr.st===false&&pr.hid&&pr.back>.5&&pr.sw==='true','pen pressure: switched off, a pressed stylus draws the same line (and it’s remembered); switched on again it reacts');
  await A.click('#tools [data-g="draw"]');await A.waitForTimeout(150);
  ok(!(await menu(A)).open&&await A.evaluate(()=>tool==='brush'),'tap Draw again: the menu closes, the brush stays');
  // the other tools: each its own menu
  await A.click('#tools [data-t="hl"]');await A.waitForTimeout(150);m=await menu(A);
  ok(m.open&&m.title==='Highlighter'&&m.col&&m.size&&!m.press&&!m.kind&&await A.evaluate(()=>$('#cols .sw').style.background&&color===cmem.h),'Highlighter: its menu with its own colors and size (no pen pressure)');
  await A.click('#tools [data-t="eraser"]');await A.waitForTimeout(150);m=await menu(A);
  ok(m.open&&m.title==='Eraser'&&m.size&&!m.col&&/Undo/.test(m.note),'Eraser: just the size');
  await A.click('#tools [data-t="shape"]');await A.waitForTimeout(150);m=await menu(A);
  await A.click('#shapes [data-s="rect"]');await A.click('#sh-fill');
  ok(m.open&&m.title==='Shapes'&&m.shape&&m.col&&m.size&&await A.evaluate(()=>shape==='rect'&&shFill===true&&$('#szlab').textContent==='Line'),'Shapes: pick the shape, filled or not, color and line');
  await A.click('#tools [data-t="fill"]');await A.waitForTimeout(150);m=await menu(A);
  ok(m.open&&m.title==='Fill'&&m.col&&!m.size&&/fill/.test(m.note),'Fill: the color');
  await A.click('#tools [data-t="sel"]');await A.waitForTimeout(150);m=await menu(A);
  ok(m.open&&m.title==='Select'&&!m.col&&!m.size&&/box/.test(m.note),'Select: how it works');
  await A.click('#tools [data-t="text"]');await A.waitForTimeout(150);m=await menu(A);
  ok(m.open&&m.title==='Text'&&m.font&&m.col&&await A.evaluate(()=>document.querySelectorAll('#tx-fonts button').length===8),'Text: the 8 fonts, size, style and color');
  await A.click('#tx-fonts button:nth-child(2)');await A.click('#tx-b');
  ok(await A.evaluate(()=>tdef.fm==='serif'&&tdef.b===1&&$('#tx-fonts button:nth-child(2)').getAttribute('aria-pressed')==='true'),'… the next text will be Serif and bold');
  await A.keyboard.press('Escape');await A.waitForTimeout(100);
  ok(!(await menu(A)).open&&!(await A.evaluate(()=>$('#ed').classList.contains('hidden'))),'Escape closes the menu (and stays in the editor)');
  // drawing on the page closes the menu and draws
  await A.evaluate(()=>selectTool('pen'));await A.click('#tools [data-g="draw"]');await A.waitForTimeout(100);
  const h0=await A.evaluate(()=>hist.length);
  const pr2=await A.evaluate(()=>{const r=$('#cv').getBoundingClientRect();return {x:r.left+r.width*.3,y:r.top+r.height*.3}});
  await A.mouse.move(pr2.x,pr2.y);await A.mouse.down();await A.mouse.move(pr2.x+80,pr2.y+40,{steps:6});await A.mouse.up();await A.waitForTimeout(200);
  ok(!(await menu(A)).open&&await A.evaluate(h=>hist.length>h,h0),'drawing on the page closes the menu, and the line is drawn');
  // writing: the text bar has a color button
  await A.evaluate(()=>selectTool('text'));await A.waitForTimeout(100);
  const tp=await A.evaluate(()=>{const r=$('#cv').getBoundingClientRect();return {x:r.left+r.width*.4,y:r.top+r.height*.6}});
  await A.mouse.click(tp.x,tp.y);await A.waitForTimeout(400);await A.keyboard.type('Hello');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>!$('#tbar').classList.contains('hidden')&&!!$('#t-col').offsetParent),'writing: the text bar shows, with a color button');
  await A.click('#t-col');await A.waitForTimeout(150);m=await menu(A);
  ok(m.open&&m.title==='Text color'&&m.col&&!m.font&&!m.size,'… it opens just the colors');
  await A.click('#cols .sw:nth-child(8)');await A.waitForTimeout(150);
  ok(await A.evaluate(()=>{const d=selText();return d&&rtEffNow(d).c===INK[7]}),'… and the text takes the color');
  await A.evaluate(()=>{closeTS();commitText();selectObj(null);selectTool('pen')});
  // +: photos, stickers, emoji, notes, labels
  await A.click('#plus');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>!$('#sheet').classList.contains('hidden')&&!!$('#photo').offsetParent&&['emoji','stick','note','label'].every(k=>$('#stabs [data-p="'+k+'"]'))),'“+”: photo, emoji, stickers, notes and labels');
  ok(await A.evaluate(()=>{const s=$('#sheet').getBoundingClientRect(),d=$('#dock').getBoundingClientRect();return s.bottom<=d.top&&s.left>=0&&s.right<=innerWidth}),'… a card above the tools');
  const [fc]=await Promise.all([A.waitForEvent('filechooser',{timeout:4000}).catch(()=>null),A.click('#photo')]);
  ok(!!fc&&await A.evaluate(()=>$('#sheet').classList.contains('hidden')),'… Photo opens the picture chooser');
  await A.click('#lyb');await A.waitForTimeout(300);
  ok(await A.evaluate(()=>!$('#lsheet').classList.contains('hidden')),'Layers opens from the top');
  await A.click('#lsx');
  await A.click('#eye');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>!!$('#tools').offsetParent&&!$('#tools [aria-pressed="true"]')&&!!$('#plus').offsetParent&&!!$('#o-done').offsetParent&&/Tap an object|Nothing here/.test($('#ohint').textContent)),'view and arrange: the tools stay on screen (none in use), with + and Done, and a hint');
  await A.click('#o-done');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>!view&&!!$('#tools [aria-pressed="true"]')&&!$('#o-done').offsetParent),'… Done goes back to drawing');
  // after adding a sticker (or a label, a photo…) the app arranges it: the tools are still there, and a tap on one goes back to drawing
  await A.click('#plus');await A.click('#stabs [data-p="stick"]');await A.waitForTimeout(300);await A.click('#spane .eg.st button');await A.waitForTimeout(700);
  ok(await A.evaluate(()=>view&&!!$('#tools').offsetParent&&!!$('#plus').offsetParent),'after adding a sticker: it can be moved, and the tools are still on screen');
  await A.click('#tools [data-g="draw"]');await A.waitForTimeout(200);m=await menu(A);
  ok(await A.evaluate(()=>!view&&DRAW.includes(tool)&&$('#tools [data-g="draw"]').getAttribute('aria-pressed')==='true')&&m.open&&/Pen|Pencil|Brush|Marker/.test(m.title),'… tap Draw: back to drawing, with its menu');
  await A.evaluate(()=>closeTS());
  await A.click('#plus');await A.click('#stabs [data-p="label"]');await A.waitForSelector('#spane [data-l]');await A.click('#spane [data-l]');await A.waitForTimeout(900);
  ok(await A.evaluate(()=>view&&!!$('#tools').offsetParent&&!!$('#o-done').offsetParent),'after adding a label: the tools and Done are on screen');
  await A.click('#tools [data-t="text"]');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>!view&&tool==='text'&&!$('#tsheet').classList.contains('hidden')),'… tap Text: back to writing, with its menu');
  await A.evaluate(()=>{closeTS();selectTool('pen')});

  // ---- Page style: not on a page from a PDF
  await A.evaluate(async()=>{const b=mk('Pdf book',data.length,'p');const k=document.createElement('canvas');k.width=k.height=8;k.getContext('2d').fillRect(0,0,8,8);
    b.pages=[null,null,null,null];b.bg[1]=k.toDataURL();data.push(b);persist();await saveNow();showBrowse(b)});await A.waitForTimeout(400);
  await A.evaluate(()=>showEditor(1));await A.waitForTimeout(500);
  const ps1=await A.evaluate(()=>!$('#pstyle').offsetParent);
  await A.evaluate(()=>showEditor(2));await A.waitForTimeout(500);
  const ps2=await A.evaluate(()=>!!$('#pstyle').offsetParent);
  ok(ps1&&ps2,'Page style: hidden on a page from a PDF, there on a normal page');
  await A.evaluate(()=>{$('#ed').classList.add('hidden');showBrowse()});

  // ---- New pages: 1 or 2, and where
  // six pages, each with its own little picture, so the order can be checked; the book open at pages 3–4
  const mkBook=()=>A.evaluate(async()=>{const b=mk('Order',data.length,'p');b.pages=[];
    for(let i=0;i<6;i++){const k=document.createElement('canvas');k.width=k.height=4;const x=k.getContext('2d');x.fillStyle='rgb('+(i*40)+',10,10)';x.fillRect(0,0,4,4);b.pages.push(k.toDataURL())}
    window._mk=b.pages.slice();b.cs=1;data.push(b);persist();await saveNow();SET.oanim=false;showBrowse(b);return b.pages.length});
  const order=()=>A.evaluate(()=>cur.pages.map(p=>{const i=window._mk.indexOf(p);return i<0?'N':String(i+1)}).join(''));
  const addPg=async(n,k)=>{await A.click('#badd');await A.waitForSelector('#npd:not(.hidden)');await A.click('#npn [data-n="'+n+'"]');await A.click('#npw [data-k="'+k+'"]');await A.click('#npats [data-p="blank"]');await A.click('#npyes');await A.waitForTimeout(1300)};
  await mkBook();await A.waitForTimeout(500);
  ok(await A.evaluate(()=>cs===1),'(the book opens at pages 3–4)');
  await A.click('#badd');await A.waitForSelector('#npd:not(.hidden)');
  const dlg=await A.evaluate(()=>({n:[...document.querySelectorAll('#npn button')].map(b=>b.textContent+':'+b.getAttribute('aria-pressed')).join(),
    w:[...document.querySelectorAll('#npw button')].map(b=>b.dataset.k+':'+b.getAttribute('aria-checked')).join()}));
  ok(dlg.n==='1 page:false,2 pages:true'&&dlg.w==='before:false,after:true,end:false','New pages asks how many (1 or 2) and where: before these pages, after them (chosen), or at the end');
  await A.click('#npn [data-n="1"]');
  ok(await A.evaluate(()=>[...document.querySelectorAll('#npw button')].map(b=>b.dataset.k).join()==='left,right,end'&&/Between pages 3 and 4/.test($('#npw').textContent)),'… 1 page: on the left, on the right (between pages 3 and 4), or at the end');
  await A.click('#npno');
  await addPg(1,'left');ok(await order()==='12N3456'&&await A.evaluate(()=>cs===1),'1 page on the left: it’s page 3 now, the old pages 3–4 move on ('+await order()+')');
  await addPg(1,'right');ok(await order()==='12NN3456','1 page on the right: right after page 3 ('+await order()+')');
  await A.evaluate(()=>{data.pop();persist()});await mkBook();await A.waitForTimeout(500);
  await addPg(2,'before');ok(await order()==='12NN3456'&&await A.evaluate(()=>cs===1),'2 pages before these pages ('+await order()+')');
  await A.evaluate(()=>{data.pop();persist()});await mkBook();await A.waitForTimeout(500);
  await addPg(2,'after');ok(await order()==='1234NN56'&&await A.evaluate(()=>cs===2),'2 pages after these pages, and the book turns to them ('+await order()+')');
  await addPg(1,'end');ok(await order()==='1234NN56N','1 page at the end ('+await order()+')');
  ok(await A.evaluate(async()=>{await saveNow();for(let i=0;i<cur.pages.length;i++){const r0=await idbGet(P2+'p:'+cur.id+':'+i),r=typeof r0==='string'?JSON.parse(r0):r0;if(!r||(r.pg??null)!==cur.pages[i])return false}return true}),'… every page is saved in its new place');
  // the free plan: 20 pages at most, so with 19 only 1 more fits
  await A.evaluate(async()=>{while(cur.pages.length<19)cur.pages.push(null);persist();await saveNow();renderBrowse()});
  await A.click('#badd');await A.waitForSelector('#npd:not(.hidden)');
  ok(await A.evaluate(()=>$('#npn [data-n="2"]').disabled&&$('#npn [data-n="1"]').getAttribute('aria-pressed')==='true'),'free plan with 19 pages: only 1 more page can be added');
  await A.click('#npno');

  // ---- Settings: no page-turn sound; the opening animation can be switched off
  await A.evaluate(()=>{$('#bv').classList.add('hidden')});
  ok(await A.evaluate(()=>!/Page-turn sound/.test($('#set').textContent)&&!!$('#s-oanim')&&/Opening animation/.test($('#set').textContent)),'Settings: no page-turn sound; an “Opening animation” option');
  const op=async on=>{await A.evaluate(o=>{SET.oanim=o;saveSet();window._fl=0;const f0=flip;window.flip=function(...a){window._fl++;return f0.apply(this,a)};const b=data.find(x=>x.title==='Order');b.cs=3;showBrowse(b)},on);
    const at0=await A.evaluate(()=>cs);await A.waitForTimeout(3500);return {at0,at:await A.evaluate(()=>cs),fl:await A.evaluate(()=>window._fl)}};
  const off=await op(false);
  ok(off.at0===3&&off.at===3&&off.fl===0,'Opening animation off: the notebook opens right at the page where you left off, nothing turns');
  await A.evaluate(()=>{$('#bv').classList.add('hidden')});
  const on=await op(true);
  ok(on.at0===-1&&on.at===3&&on.fl>0,'Opening animation on (the default): the cover opens and the pages turn to it');
  // the guided tour: just the buttons, no frame around them
  await A.evaluate(()=>{tourShow(0)});await A.waitForTimeout(400);
  ok(await A.evaluate(()=>{const c=getComputedStyle(document.querySelector('.tcard .trow'));return c.borderTopWidth==='0px'&&c.paddingTop==='0px'}),'the guided tour: Skip and Next without a frame around them');
  await A.evaluate(()=>tourClose());

  // ---- the admin panel's assistant: compares with before, says what to do next, in English or Romanian
  {
    const uid=await A.evaluate(()=>ACC.user.uid),N=Date.now(),d=new Date(N),ms=+new Date(d.getFullYear(),d.getMonth(),1),pms=+new Date(d.getFullYear(),d.getMonth()-1,1);
    const off=Math.max(0,N-ms-3600e3),tNow=ms+off,tPrev=pms+off; // a moment this month, and the same moment last month
    const ts=t=>({timestampValue:new Date(t).toISOString()}),ym=t=>{const x=new Date(t);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')};
    await admin('admins/'+uid,{fields:{note:{stringValue:'test'}}});
    await admin('config/costs',{fields:{items:{arrayValue:{values:[{mapValue:{fields:{n:{stringValue:'Firebase'},c:{integerValue:'2100'},per:{stringValue:'month'},at:{stringValue:ym(pms-40*864e5)}}}}]}}}});
    for(let i=0;i<12;i++)await admin('profiles/pn'+i,{fields:{email:{stringValue:'n'+i+'@x.com'},created:ts(tNow-i*1000),seen:ts(tNow),os:{stringValue:i<9?'android':'windows'}}});
    for(let i=0;i<5;i++)await admin('profiles/pp'+i,{fields:{email:{stringValue:'p'+i+'@x.com'},created:ts(tPrev-i*1000),seen:ts(tPrev),os:{stringValue:'ios'}}});
    for(let i=0;i<6;i++)await admin('survey/pn'+i,{fields:{src:{stringValue:i<4?'youtube':'instagram'},other:{stringValue:''},at:ts(tNow)}});
    await admin('feedback/f1',{fields:{uid:{stringValue:'pn1'},email:{stringValue:'n1@x.com'},type:{stringValue:'problem'},text:{stringValue:'It crashed'},reply:{booleanValue:false},at:ts(tNow)}});
    await admin('customers/'+uid+'/payments/pa1',{fields:{status:{stringValue:'succeeded'},amount:{integerValue:'599'},amount_received:{integerValue:'599'},currency:{stringValue:'eur'},created:{integerValue:String(Math.floor(tNow/1000))},invoice:{stringValue:'in_a'}}});
    await admin('customers/'+uid+'/payments/pa2',{fields:{status:{stringValue:'succeeded'},amount:{integerValue:'599'},amount_received:{integerValue:'599'},currency:{stringValue:'eur'},created:{integerValue:String(Math.floor(tNow/1000)+60)},invoice:{stringValue:'in_b'}}});
    await admin('customers/'+uid+'/payments/pa0',{fields:{status:{stringValue:'succeeded'},amount:{integerValue:'599'},amount_received:{integerValue:'599'},currency:{stringValue:'eur'},created:{integerValue:String(Math.floor(tPrev/1000))},invoice:{stringValue:'in_c'}}});
    await A.evaluate(()=>{try{localStorage.removeItem('sb-admlang')}catch(e){}ADM.lang='en';checkAdmin(ACC.user)});await A.waitForTimeout(600);
    await A.evaluate(()=>openAdmin());await A.waitForSelector('#adm-body .adv',{timeout:20000});
    const en=await A.evaluate(()=>{const b=$('.asec[data-s="ov"] .adv');return {t:b.textContent,secs:[...b.querySelectorAll('.adv-sec>b')].map(x=>x.textContent),up:[...b.querySelectorAll('.adv-ch.up')].length,todo:b.querySelectorAll('.adv-do li').length,top:b.querySelector('.adv-top').textContent}});
    ok(/Foliet assistant/.test(en.t)&&['Money','People','Pro','Where people found','Feedback','Devices','What I’d do next'].every(k=>en.secs.some(x=>x.includes(k))),'admin assistant: money, people, Pro, where people found Foliet, feedback, devices and what to do next ('+en.secs.length+' parts)');
    ok(/Income: €11\.98 \(this month so far, against the same days of [A-Z][a-z]{2}: €5\.99\)/.test(en.t)&&/1[23] new accounts/.test(en.t)&&en.up>=2&&/Good news: income is up 100%/.test(en.top),'… it compares with the same days of last month: income doubled, 12 new accounts against 5 (▲)');
    ok(/Your running costs are about €21\.00 a month/.test(en.t)&&/Most came from YouTube \(\d+% of [67] answers\)/.test(en.t)&&/1 open message, 1 about a problem/.test(en.t)&&/\d+% use a phone or tablet/.test(en.t)&&/Profit after fees, refunds and costs: −€/.test(en.t),'… running costs, the top source (YouTube), open problems, phones, and a loss shown as −€');
    ok(en.todo>=2&&/problem report/.test(en.t)&&/Payments are off/.test(en.t),'… and what to do next: answer the problem report, turn payments on…');
    if(process.env.SHOT)await (await A.$('.asec[data-s="ov"] .adv')).screenshot({path:process.env.SHOT+'/adv-en.png'});
    await A.click('.asec[data-s="ov"] .adv-l button:nth-child(2)');await A.waitForTimeout(200);
    if(process.env.SHOT)await (await A.$('.asec[data-s="ov"] .adv')).screenshot({path:process.env.SHOT+'/adv-ro.png'});
    const ro=await A.evaluate(()=>{const b=$('.asec[data-s="ov"] .adv');return {t:b.textContent,lang:localStorage.getItem('sb-admlang'),rest:$('#adm-body').textContent}});
    ok(/Asistentul Foliet/.test(ro.t)&&/Ce aș face mai departe/.test(ro.t)&&/Venit: €11\.98/.test(ro.t)&&/1[23] conturi noi/.test(ro.t)&&/Vești bune: venitul a crescut cu 100%/.test(ro.t)&&ro.lang==='ro','RO: the assistant speaks Romanian (and remembers it)');
    ok(/Money & profit/.test(ro.rest)&&/New sign-ups/.test(ro.rest),'… the rest of the admin panel stays in English');
    await A.evaluate(()=>{ADM.tab='money';admShow()});await A.waitForTimeout(200);
    ok(await A.evaluate(()=>/Asistentul Foliet/.test($('.asec[data-s="money"] .adv').textContent)&&!$('.asec[data-s="money"] .adv').textContent.includes('Oameni')),'Money & profit: the money part of the assistant');
    await A.evaluate(()=>{localStorage.removeItem('sb-admlang');ADM.lang='en';$('#admin').classList.add('hidden')});
  }
  ok(!A.errs.length,'computer: no errors '+A.errs.join(' | '));

  // ---------- a tablet and a phone: everything fits
  for(const [nm,vp] of [['tablet',{width:1024,height:1366}],['phone',{width:390,height:844}],['small phone',{width:360,height:740}]]){
    const P=await open(vp,{hasTouch:true,isMobile:nm!=='tablet'});
    await P.evaluate(()=>showBrowse(data[0]));await P.waitForTimeout(1500);
    ok(await inside(P,'#bv button,#bv input'),nm+': an open notebook – every button inside the screen');
    if(nm!=='tablet')ok(await P.evaluate(()=>{const b=$('#badd').getBoundingClientRect(),i=$('#badd .nb').getBoundingClientRect();return Math.abs((i.left+i.width/2)-(b.left+b.width/2))<=1.5&&Math.abs((i.top+i.height/2)-(b.top+b.height/2))<=1.5}),nm+': the + of New pages is in the middle of its circle');
    await P.tap('#bzoom');await P.waitForTimeout(400);
    ok(await P.evaluate(()=>{const c=getComputedStyle($('#bzoom'));return c.backgroundColor!==c.color&&!!$('#bzoom').offsetWidth}),nm+': Zoom on – the button stays visible');
    await P.evaluate(()=>resetZoom());
    await P.evaluate(()=>showEditor(1));await P.waitForTimeout(900);
    ok(await inside(P,'#ed>.bar button,#ed>.bar input,#dock button'),nm+': the editor – every button inside the screen');
    const dc=await P.evaluate(()=>{const r=$('#dock').getBoundingClientRect();return Math.abs(r.left+r.width/2-innerWidth/2)});
    ok(dc<=2,nm+': the tools in the middle');
    await P.tap('#tools [data-g="draw"]');await P.waitForTimeout(250);
    ok(await inside(P,'#tsheet'),nm+': the Draw menu fits on the screen');
    await P.tap('#tools [data-t="text"]');await P.waitForTimeout(250);
    ok((await menu(P)).title==='Text'&&await inside(P,'#tsheet'),nm+': the Text menu fits too');
    ok(await P.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),nm+': no sideways scroll');
    ok(!P.errs.length,nm+': no errors '+P.errs.join(' | '));
    await P.context().close();
  }
  await b.close();srv.close();
  console.log(fails?fails+' FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
