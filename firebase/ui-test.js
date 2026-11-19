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
  ok(await A.evaluate(()=>!$('#tools').offsetParent&&!!$('#plus').offsetParent&&!!$('#obar').offsetParent&&/Tap an object|Nothing here/.test($('#ohint').textContent)),'view and arrange: the drawing tools step aside, + stays, and a hint shows');
  await A.click('#eye');await A.waitForTimeout(200);
  ok(await A.evaluate(()=>!!$('#tools').offsetParent),'… and come back');
  ok(!A.errs.length,'computer: no errors '+A.errs.join(' | '));

  // ---------- a tablet and a phone: everything fits
  for(const [nm,vp] of [['tablet',{width:1024,height:1366}],['phone',{width:390,height:844}],['small phone',{width:360,height:740}]]){
    const P=await open(vp,{hasTouch:true,isMobile:nm!=='tablet'});
    await P.evaluate(()=>showBrowse(data[0]));await P.waitForTimeout(1500);
    ok(await inside(P,'#bv button,#bv input'),nm+': an open notebook – every button inside the screen');
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
