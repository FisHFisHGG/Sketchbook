// The landing page (index.html): the “See what’s inside” tour and the notebook at the top. No Firebase needed:
//   node firebase/landing-test.js
// Tour: 10 steps close together, the card with 01 / 10, a dot per step and arrows; the dots, the arrows and a tap on a step
// bring that step to the reading line; plain scrolling goes through every step; the card never slides under the top bar;
// no sideways scroll on a phone, a tablet or a computer.
// Notebook at the top: opens, turns through all its spreads (album, sketches, class notes, a book + notes, planner),
// closes and starts again; no dark pages (only the cover); it waits while it isn't on screen; reduce motion shows the album.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const SITE=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
let bad=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)bad++};
(async()=>{
  const srv=require('http').createServer((q,res)=>{let f=path.join(SITE,decodeURIComponent(new URL(q.url,'http://x').pathname));if(f.endsWith(path.sep))f=path.join(f,'index.html');
    if(f.startsWith(SITE)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});return res.end(fs.readFileSync(f))}res.writeHead(404);res.end()}).listen(5310,'127.0.0.1');
  const URL0='http://127.0.0.1:5310/index.html';
  const b=await chromium.launch();

  // ---- the tour on a computer, a phone and a tablet
  for(const [name,vp] of [['computer',{width:1366,height:860}],['phone',{width:390,height:844}],['tablet',{width:820,height:1180}]]){
    const p=await (await b.newContext({viewport:vp,hasTouch:name!=='computer'})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(URL0);await p.waitForTimeout(300);
    const st=()=>p.evaluate(()=>{const on=document.querySelector('.st.on').getBoundingClientRect();return {s:+document.querySelector('#demo').dataset.s,num:document.querySelector('#tnum').textContent,
      dot:[...document.querySelectorAll('#tdots button')].findIndex(d=>d.classList.contains('on')),off:Math.round(on.top+on.height/2-tourLine())}});
    const info=await p.evaluate(()=>({steps:document.querySelectorAll('.st').length,dots:document.querySelectorAll('#tdots button').length,h:document.querySelector('#inside').offsetHeight,vh:innerHeight,
      pro:[...document.querySelectorAll('.st h3 .soon')].map(e=>e.closest('.st').dataset.s).join()}));
    ok(info.steps===10&&info.dots===10,name+': 10 steps and 10 dots');
    ok(info.pro==='6',name+': only “Books and PDFs” has the Pro badge in the headings ('+info.pro+')');
    ok(info.h<info.vh*(name==='phone'?4.8:4.6),name+': the tour is short to scroll ('+(info.h/info.vh).toFixed(1)+' screens)');
    await p.evaluate(()=>document.querySelector('#inside').scrollIntoView({behavior:'instant'}));await p.waitForTimeout(500);
    let r=await st();ok(r.s===0&&r.num==='01'&&r.dot===0&&await p.evaluate(()=>document.querySelector('#tprev').disabled),name+': starts on 01, “previous” is off');
    await p.click('#tnext');await p.waitForTimeout(1100);r=await st();ok(r.s===1&&r.num==='02'&&r.dot===1&&Math.abs(r.off)<6,name+': “next” → 02, on the reading line '+JSON.stringify(r));
    await p.click('#tdots button:nth-child(8)');await p.waitForTimeout(1300);r=await st();ok(r.s===7&&r.dot===7&&Math.abs(r.off)<6,name+': dot 8 → 08 '+JSON.stringify(r));
    ok(await p.evaluate(()=>document.querySelector('#demo').classList.contains('g7')&&!document.querySelector('#demo').classList.contains('g8')),name+': the notebook shows step 08 (All pages)');
    await p.click('#tprev');await p.waitForTimeout(1100);r=await st();ok(r.s===6&&Math.abs(r.off)<6,name+': “previous” → 07 '+JSON.stringify(r));
    await p.click('#tdots button:nth-child(10)');await p.waitForTimeout(1400);r=await st();ok(r.s===9&&Math.abs(r.off)<6&&await p.evaluate(()=>document.querySelector('#tnext').disabled),name+': last dot → 10, “next” is off');
    const top=await p.evaluate(()=>document.querySelector('.tpanel').getBoundingClientRect().top);ok(top>=64,name+': the card stays below the top bar on the last step ('+Math.round(top)+' px)');
    if(name!=='tablet'){ // the step above is visible (faded): a tap on it goes there
      await p.click('.st[data-s="8"] h3');await p.waitForTimeout(1200);r=await st();ok(r.s===8&&Math.abs(r.off)<6,name+': a tap on the faded step 09 → 09 '+JSON.stringify(r));
    }
    await p.evaluate(()=>scrollTo({top:document.querySelector('#inside').offsetTop-200,behavior:'instant'}));await p.waitForTimeout(300);
    const seen=new Set();for(let y=0;y<70;y++){await p.mouse.wheel(0,90);await p.waitForTimeout(50);seen.add((await st()).s)}
    ok(seen.size===10,name+': plain scrolling goes through all 10 steps');
    if(name!=='computer')ok(await p.evaluate(()=>[...document.querySelectorAll('.st .tchips')].every(c=>c.offsetHeight>0)&&getComputedStyle(document.querySelector('#chips')).display==='none'),name+': the chips sit under each step');
    else ok(await p.evaluate(()=>document.querySelector('#chips').children.length>0&&getComputedStyle(document.querySelector('.st .tchips')).display==='none'),name+': the chips sit under the notebook');
    ok(await p.evaluate(()=>document.documentElement.scrollWidth===document.documentElement.clientWidth),name+': no sideways scroll');
    ok(!errs.length,name+': no errors '+errs.join(' | '));
    await p.context().close();
  }

  // ---- the notebook at the top: every spread, no dark pages, closes and starts again
  {
    const p=await (await b.newContext({viewport:{width:1366,height:860}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(URL0);
    const look=()=>p.evaluate(()=>{const lum=c=>{const m=c.match(/[\d.]+/g)||[0,0,0];return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255};
      const pages=[...document.querySelectorAll('#hb .hb-l .pp,#hb .hb-r .pp')].map(e=>({k:[...e.classList].filter(c=>c!=='pp').join('.'),l:lum(getComputedStyle(e).backgroundColor),t:e.textContent.trim().slice(0,24)}));
      return {cls:document.querySelector('#hb').className,pages}});
    const kinds=new Set(),texts=new Set();let dark=0,closedAgain=false,opened=false;const t0=Date.now();
    while(Date.now()-t0<30000){
      const s=await look();
      if(!/closed/.test(s.cls))opened=true;else if(opened)closedAgain=true;
      s.pages.forEach(x=>{kinds.add(x.k);texts.add(x.t);if(x.l<.45&&!/cover|inside/.test(x.k))dark++});
      if(closedAgain&&texts.size>6)break;
      await p.waitForTimeout(400);
    }
    const all=[...texts].join(' / ');
    ok(['Hello!','Summer','Sketches','Biology','The cell','CHAPTER 3','Ch. 3','This week','July'].every(w=>all.includes(w)),'top notebook: shows every spread – album, sketches, class notes, the book + notes, planner');
    ok(kinds.has('print')&&kinds.has('grid')&&kinds.has('album'),'top notebook: the new page kinds are there (a printed book page, grid paper)');
    ok(dark===0,'top notebook: no dark pages (only the cover)');
    ok(closedAgain,'top notebook: closes at the end and starts again');
    // off screen it waits
    await p.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));await p.waitForTimeout(1600); // a turn already under way finishes first
    const a=await look();await p.waitForTimeout(8000);const c=await look();
    ok(JSON.stringify(a)===JSON.stringify(c),'top notebook: waits while it is not on screen'+(JSON.stringify(a)===JSON.stringify(c)?'':' '+JSON.stringify(a).slice(0,300)+' → '+JSON.stringify(c).slice(0,300)));
    ok(!errs.length,'top notebook: no errors '+errs.join(' | '));
    await p.context().close();
  }

  // ---- reduce motion: the album straight away; the tour still works
  {
    const p=await (await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})).newPage();
    await p.goto(URL0);await p.waitForTimeout(400);
    ok(await p.evaluate(()=>!document.querySelector('#hb').classList.contains('closed')&&/Summer/.test(document.querySelector('#hb .hb-l').textContent)),'reduce motion: the top notebook shows the album');
    await p.evaluate(()=>document.querySelector('#inside').scrollIntoView({behavior:'instant'}));await p.waitForTimeout(300);
    await p.click('#tnext');await p.click('#tnext');await p.waitForTimeout(300);
    ok(await p.evaluate(()=>document.querySelector('#demo').dataset.s==='2'),'reduce motion: the arrows still move through the tour');
    await p.context().close();
  }
  await b.close();srv.close();
  console.log(bad?bad+' FAILED':'all passed');process.exit(bad?1:0);
})();
