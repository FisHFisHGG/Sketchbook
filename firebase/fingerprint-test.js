// Android fingerprint unlock, with Chrome's virtual authenticator standing in for the phone's fingerprint reader.
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node fingerprint-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','app');
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
// the one-time "How did you find Foliet?" question appears after a new account; answer it so the test can go on
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const ANDROID='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
(async()=>{
  require('http').createServer((q,res)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!f.startsWith('/app/')){res.writeHead(404);return res.end()}
    f=path.join(ROOT,f.slice(4));if(f.endsWith(path.sep)||f===ROOT)f=path.join(f,'index.html');
    if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))}else{res.writeHead(404);res.end('nf')}}).listen(5179,'127.0.0.1');
  const b=await chromium.launch({args:['--host-resolver-rules=MAP localhost 127.0.0.1']}); // WebAuthn needs a name like "localhost", not an IP
  const run=async(ua,label)=>{
    const ctx=await b.newContext({viewport:{width:412,height:860},userAgent:ua,hasTouch:true,isMobile:true});
    await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});
    await ctx.route(u=>!/^(localhost|127\.0\.0\.1)$/.test(u.hostname),r=>r.abort());
    const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    const cdp=await ctx.newCDPSession(p);await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
    await p.goto('http://localhost:5179/app/?emu=127.0.0.1');await p.waitForSelector('#a-em',{timeout:15000});
    await p.tap('.btn2');await p.fill('#a-em',label+'@example.com');await p.fill('#a-pw','secret123');await p.tap('#acc-body button[type=submit]');
    await p.waitForFunction(()=>ACC.libUid&&!ACC.gate,null,{timeout:20000});await answerSurvey(p);await p.waitForTimeout(400);
    await p.tap('.cell:not(.add)');await p.waitForTimeout(700);await p.tap('#block');await p.waitForSelector('#lockd:not(.hidden)');
    const offered=await p.evaluate(()=>/fingerprint/i.test(document.querySelector('#lockc').textContent));
    const ins=await p.$$('#lockc .lk-in');await ins[0].fill('2468');await ins[1].fill('2468');await p.tap('text=Lock notebook');
    await p.waitForFunction(()=>cur.lock,null,{timeout:10000});await p.waitForTimeout(500);
    return {p,ctx,errs,offered,cdp};
  };
  const A=await run(ANDROID,'android');
  ok(A.offered,'Android: the lock window offers fingerprint unlock');
  ok(await A.p.evaluate(()=>bioOn(cur.id)),'Android: fingerprint turned on for this notebook (phone prompt passed)');
  await A.p.tap('#bclose');await A.p.waitForTimeout(400);
  await A.p.tap('.cell:not(.add)');await A.p.waitForTimeout(2000);
  ok(await A.p.evaluate(()=>!$('#bv').classList.contains('hidden')),'Android: opening the locked notebook asks for the fingerprint and opens it');
  await A.p.tap('#bclose');await A.p.waitForTimeout(300);
  const D=await run('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36','desktop');
  ok(!D.offered,'computer / iPhone: no fingerprint option, PIN only');
  [...A.errs,...D.errs].forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
