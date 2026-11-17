// Update 9: new prices (€5.99 a month, €44.99 a year), no "Free" badge on the landing, Pro codes that ask for a card
// (an offer that lasts 24 hours, Stripe free trial), and the welcome offer for new accounts (% off Pro yearly).
// Stripe isn't connected in the emulator: the test plays the extension's part (it adds the checkout url, the stripeRole claim).
// How to run (from this folder, with Java installed):
//   npm i --no-save playwright firebase-tools
//   npx firebase emulators:exec --only auth,firestore --project sketchbook-b1de1 "node update9-test.js"
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','app'),PID='sketchbook-b1de1',DB='http://127.0.0.1:8080/v1/projects/'+PID+'/databases/(default)/documents';
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const answerSurvey=async(p,v='youtube')=>{try{await p.waitForSelector('#srv',{timeout:4000})}catch(e){return false}await p.click('#srv .srv-opt[data-v="'+v+'"]');await p.click('#srv .btn');await p.waitForSelector('#srv',{state:'detached'});return true};
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const admin=(p,body,method='PATCH')=>fetch(DB+'/'+p,{method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
const claim=(uid,c)=>fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/'+PID+'/accounts:update',{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({localId:uid,customAttributes:JSON.stringify(c)})});
(async()=>{
  // ---- the landing page and the terms
  const land=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'),terms=fs.readFileSync(path.join(__dirname,'..','terms.html'),'utf8');
  ok(!/<span class="soon">Free<\/span>/.test(land)&&!/Included free/.test(land)&&/<h3>Private notebooks<\/h3>/.test(land),'landing: no "Free" badge on "Private notebooks" (only Pro features get a badge)');
  ok(/"price":"5\.99"/.test(land)&&/"price":"44\.99"/.test(land)&&/€44\.99/.test(land)&&/'€5\.99','per month'/.test(land)&&/That’s €3\.75 a month/.test(land)&&/Save 37%/.test(land),'landing: Pro €5.99 a month, €44.99 a year (€3.75 a month, save 37%)');
  ok(/€5\.99 a month or €44\.99 a year/.test(terms),'terms: the new prices');

  require('http').createServer((q,res)=>{let f=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!f.startsWith('/app/')){res.writeHead(404);return res.end()}
    f=path.join(ROOT,f.slice(4));if(f.endsWith(path.sep)||f===ROOT)f=path.join(f,'index.html');
    if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))}else{res.writeHead(404);res.end('nf')}}).listen(5192,'127.0.0.1');
  const b=await chromium.launch();
  const URL0='http://127.0.0.1:5192/app/?emu=127.0.0.1';
  const ctxOf=async()=>{const ctx=await b.newContext({viewport:{width:1100,height:820}});await ctx.addInitScript(()=>{try{localStorage.setItem('sb-tour','99')}catch(e){}});await ctx.route(u=>u.hostname!=='127.0.0.1',r=>r.abort());return ctx};
  const open=async(ctx,name)=>{const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(name+': '+e.message));await p.goto(URL0);return p};
  const ready=p=>p.waitForFunction(()=>ACC.libUid&&!ACC.gate&&data.length,null,{timeout:20000});
  const signUp=async(p,em)=>{await p.waitForSelector('#a-em',{timeout:15000});await p.click('.btn2');await p.fill('#a-em',em);await p.fill('#a-pw','secret123');await p.click('#acc-body button[type=submit]');await ready(p);await answerSurvey(p);await p.waitForTimeout(500)};
  const reload=async p=>{await p.reload();await ready(p);await p.waitForTimeout(1500)};
  const goneTo=p=>p.evaluate(()=>{window._went='';window.goTo=u=>{window._went=u}});
  const sessions=async uid=>{const j=await (await admin('customers/'+uid+'/checkout_sessions',null,'GET')).json();return (j.documents||[]).map(d=>({name:d.name,f:d.fields}))};

  // ---- the admin makes codes
  const CA=await ctxOf(),A=await open(CA,'A');await signUp(A,'boss9@example.com');
  const aid=await A.evaluate(()=>ACC.user.uid);await admin('admins/'+aid,{fields:{note:{stringValue:'test'}}});
  await A.evaluate(()=>checkAdmin(ACC.user));await A.waitForTimeout(400);
  ok(await A.evaluate(()=>{upsell('');const t=$('#up .upp').textContent;$('#up').classList.add('hidden');return t==='€5.99 a month or €44.99 a year'}),'app: the Pro window says €5.99 a month or €44.99 a year');
  await A.click('#menub');await A.click('#madm');await A.waitForSelector('.acats',{timeout:15000});await A.click('.acats >> text=Codes & discounts');
  ok(await A.evaluate(()=>$('#adm-kind').value==='pro'&&!!$('#adm-card')&&!$('.adm-cardw').classList.contains('hidden')),'admin: a Pro code can “Ask for a card first”');
  await A.check('#adm-card');
  ok(await A.evaluate(()=>!$('.adm-cardw .anote').classList.contains('hidden')&&/aren’t on yet/.test($('.adm-cardw .anote').textContent)),'… with a note while card payments aren’t on');
  await A.click('.adm-cardw >> text=Preview');await A.waitForSelector('#offer');
  ok(await A.evaluate(()=>/You’ve got 1 month of Foliet Pro/.test($('#offer h2').textContent)&&/add a card/.test($('#offer').textContent)),'Preview shows the window people will see');
  await A.click('#offer .fbn-no');
  await A.fill('#adm-cf input[placeholder="CODE"]','CARD-3M');await A.selectOption('#adm-days','90');await A.fill('#adm-max','5');await A.click('#adm-cf >> text=Create code');await A.waitForSelector('#adm-codes >> text=CARD-3M',{timeout:10000});
  const cd=await (await admin('codes/CARD-3M',null,'GET')).json();
  ok(cd.fields.card.booleanValue===true&&cd.fields.days.integerValue==='90'&&await A.evaluate(()=>/CARD-3M Pro 3 months · needs a card \(24 h\)/.test($('#adm-codes').textContent)),'code CARD-3M: 3 months of Pro, needs a card (shown in the list)');
  await A.selectOption('#adm-days','0');await A.check('#adm-card');await A.fill('#adm-cf input[placeholder="CODE"]','CARD-FOREVER');await A.click('#adm-cf >> text=Create code');await A.waitForTimeout(400);
  ok(await A.evaluate(()=>/needs a length/.test($('#adm-cf .cmsg').textContent)),'a card code needs a length (the free months are a trial)');
  await admin('codes/GIFT-1M',{fields:{kind:{stringValue:'pro'},days:{integerValue:'30'},max:{integerValue:'5'},used:{integerValue:'0'},active:{booleanValue:true},note:{stringValue:''}}});
  await admin('codes/CARD-X',{fields:{kind:{stringValue:'pro'},days:{integerValue:'30'},card:{booleanValue:true},max:{integerValue:'5'},used:{integerValue:'0'},active:{booleanValue:true},note:{stringValue:''}}});

  // ---- Bea redeems a code that asks for a card
  const CB=await ctxOf(),B=await open(CB,'B');await signUp(B,'bea9@example.com');const bid=await B.evaluate(()=>ACC.user.uid);
  const rr=await B.evaluate(()=>redeemCode('card-3m'));
  ok(rr.ok&&rr.card&&rr.days===90,'Bea types CARD-3M: it is accepted as a card offer');
  await B.evaluate(r=>cardOffer({days:r.days}),rr);await B.waitForSelector('#offer');
  const ow=await B.evaluate(()=>({h:$('#offer h2').textContent,t:$('#offer').textContent,left:$('#offer .off-left').textContent}));
  ok(ow.h==='You’ve got 3 months of Foliet Pro'&&/add a card/.test(ow.t)&&/€5\.99 a month unless you cancel/.test(ow.t),'a window: "You’ve got 3 months of Foliet Pro", add a card to start, then €5.99 a month unless she cancels');
  ok(/This offer ends in 2[34] h/.test(ow.left),'… with the time left: '+ow.left);
  const offer=await (await admin('offers/'+bid,null,'GET')).json(),proB=await admin('pro/'+bid,null,'GET');
  ok(offer.fields&&offer.fields.code.stringValue==='CARD-3M'&&offer.fields.days.integerValue==='90'&&proB.status===404&&await B.evaluate(()=>!ACC.pro),'her offer is saved (offers/{uid}); no Pro yet');
  await B.click('#offer .btn');await B.waitForTimeout(400);
  ok(await B.evaluate(()=>/Adding a card opens very soon/.test($('#offer .off-msg').textContent)),'payments aren’t on yet: “Adding a card opens very soon”, the offer is kept');
  await B.click('#offer .fbn-no');await B.waitForTimeout(200);
  ok(await B.evaluate(()=>!$('#offer')),'“Later” closes it');
  await reload(B);await B.waitForSelector('#offer[data-k="card"]',{timeout:15000});
  ok(true,'when she opens Foliet again, the offer window comes back');
  await B.click('#offer .fbn-no');
  // the rules: no offer without really using a card code, and a card code never gives Pro straight away
  const r1=await B.evaluate(()=>{const F=ACC.F;return F.setDoc(F.doc(ACC.db,'offers',ACC.user.uid),{code:'CARD-X',days:30,at:F.serverTimestamp()}).then(()=>'ok',e=>e.code)});
  const r2=await B.evaluate(()=>{const F=ACC.F,db=ACC.db,u=ACC.user.uid;return F.runTransaction(db,async tx=>{const c=(await tx.get(F.doc(db,'codes','CARD-X'))).data();tx.update(F.doc(db,'codes','CARD-X'),{used:c.used+1});tx.set(F.doc(db,'redeem',u+'_CARD-X'),{uid:u,code:'CARD-X',at:F.serverTimestamp()});tx.set(F.doc(db,'pro',u),{code:'CARD-X',by:'code',since:F.serverTimestamp(),days:30})}).then(()=>'ok',e=>e.code)});
  ok(r1==='permission-denied'&&r2==='permission-denied','the rules: no offer without a card code really used, and a card code can’t give Pro straight away');

  // ---- payments on (the admin pastes the Stripe price IDs)
  await A.click('#adm-r');await A.waitForSelector('#adm-pay',{timeout:15000});
  await A.check('#adm-pon');await A.fill('#adm-pm','price_month');await A.fill('#adm-py','price_year');await A.click('#adm-pay button[type=submit]');await A.waitForTimeout(800);
  const pub=await (await admin('config/public',null,'GET')).json();
  ok(pub.fields.pay.mapValue.fields.on.booleanValue===true&&pub.fields.pay.mapValue.fields.month.stringValue==='price_month','admin → Payments: price IDs saved, payments on');
  await reload(B);await B.waitForSelector('#offer[data-k="card"]',{timeout:15000});await goneTo(B);
  await B.click('#offer .btn');await B.waitForTimeout(1200);
  let ss=await sessions(bid);const s1=ss[0]&&ss[0].f;
  ok(ss.length===1&&s1.price.stringValue==='price_month'&&s1.mode.stringValue==='subscription'&&s1.trial_period_days.integerValue==='90','“Add a card” opens Stripe Checkout: Pro monthly with a 90-day free trial');
  await fetch('http://127.0.0.1:8080/v1/'+ss[0].name+'?updateMask.fieldPaths=url',{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{url:{stringValue:'https://checkout.stripe.test/pay/cs_1'}}})});
  await B.waitForFunction(()=>window._went,null,{timeout:10000});
  ok(await B.evaluate(()=>window._went==='https://checkout.stripe.test/pay/cs_1'),'… and goes to the secure card page Stripe gives');
  // she adds the card: Stripe starts the trial and gives her the Pro role
  await claim(bid,{stripeRole:'pro'});await reload(B);await B.waitForFunction(()=>ACC.pro,null,{timeout:15000});await B.waitForTimeout(1200);
  ok(await B.evaluate(()=>ACC.pro&&!$('#offer'))&&(await admin('offers/'+bid,null,'GET')).status===404,'with the card added, Pro is on and the offer is done (no more window)');

  // ---- Carl doesn't add a card in 24 hours
  const CC=await ctxOf(),C=await open(CC,'C');await signUp(C,'carl9@example.com');const cid=await C.evaluate(()=>ACC.user.uid);
  ok((await C.evaluate(()=>redeemCode('CARD-3M'))).card,'Carl uses the same code');
  await admin('offers/'+cid+'?updateMask.fieldPaths=at',{fields:{at:{timestampValue:new Date(Date.now()-25*36e5).toISOString()}}});
  await reload(C);await C.waitForTimeout(1500);
  ok(await C.evaluate(()=>!$('#offer')&&!ACC.pro&&!!OFFER),'after 24 hours without a card the offer is gone: no window, no Pro');
  ok(await C.evaluate(()=>!cardOffer(OFFER)),'… it can’t be opened any more');
  ok((await C.evaluate(()=>redeemCode('CARD-3M'))).msg&&true,'… and the same code can’t be used again');
  ok(await C.evaluate(()=>myRecords().then(r=>!!r.offer&&r.offer.code==='CARD-3M')),'"Download my data" includes a card offer');
  // a normal Pro code still gives Pro right away
  const g=await C.evaluate(()=>redeemCode('GIFT-1M'));
  ok(g.ok&&!g.card&&g.days===30,'a code without the card box still gives Pro right away');

  // ---- the welcome offer for new accounts
  const CD=await ctxOf(),D=await open(CD,'D');await signUp(D,'dana9@example.com');
  await A.click('#adm-r');await A.waitForSelector('#adm-intro',{timeout:15000});
  ok(await A.evaluate(()=>$('#adm-ipct').value==='10'&&$('#adm-ihr').value==='3'&&$('#adm-ilast').value==='48'&&/€40\.49/.test($('#adm-intro').textContent)),'admin → Welcome offer: 10% off Pro yearly by default, after 3 hours, for 48 hours (€40.49 instead of €44.99)');
  await A.fill('#adm-ipct','15');await A.fill('#adm-ihr','0');await A.fill('#adm-ipromo','promo_WELCOME');
  ok(await A.evaluate(()=>/€38\.24/.test($('#adm-intro').textContent)),'… the price follows the percent (15% → €38.24)');
  await A.click('#adm-intro >> text=Preview');await A.waitForSelector('#offer[data-k="intro"]');
  ok(await A.evaluate(()=>/15% off Pro yearly/.test($('#offer h2').textContent)),'… Preview');await A.click('#offer .fbn-no');
  await A.click('#adm-intro button[type=submit]');await A.waitForTimeout(800);
  await reload(D);await D.waitForTimeout(1500);
  const iw=await D.evaluate(()=>{const o=$('#offer[data-k="intro"]');return o&&{h:o.querySelector('h2').textContent,t:o.textContent,left:o.querySelector('.off-left').textContent}});
  ok(iw&&iw.h==='A welcome gift: 15% off Pro yearly'&&/€38\.24 instead of €44\.99/.test(iw.t)&&/This offer ends in (4[78]) h/.test(iw.left),'Dana comes back: “A welcome gift: 15% off Pro yearly” – €38.24 instead of €44.99, ends in 48 h');
  await goneTo(D);await D.click('#offer .btn');await D.waitForTimeout(1200);
  const did=await D.evaluate(()=>ACC.user.uid);ss=await sessions(did);const s2=ss[0]&&ss[0].f;
  ok(ss.length===1&&s2.price.stringValue==='price_year'&&s2.promotion_code.stringValue==='promo_WELCOME'&&!s2.trial_period_days,'“Get Pro yearly” opens Stripe Checkout for Pro yearly with the welcome promotion code');
  await D.click('#offer .fbn-no');await reload(D);await D.waitForTimeout(1500);
  ok(await D.evaluate(()=>!$('#offer')),'it shows only once');
  await D.evaluate(()=>upsell(''));
  ok(await D.evaluate(()=>!$('#upbuy').classList.contains('hidden')&&/€5\.99 a month/.test($('#upbuy').textContent)&&/€38\.24 your first year/.test($('#upbuy').textContent)&&/15% welcome offer · ends in/.test($('#upbuy').textContent)),'the Pro window can sell Pro now, with her welcome price while it lasts');
  // a brand-new account doesn't get it on its very first visit
  const CE=await ctxOf(),E=await open(CE,'E');await signUp(E,'emil9@example.com');await E.waitForTimeout(2500);
  ok(await E.evaluate(()=>!$('#offer')),'never on the very first visit');

  [...A.errs,...B.errs,...C.errs,...D.errs,...E.errs].forEach(e=>console.log('  ERR',e));
  console.log(fails?fails+' FAILED':'ALL PASSED');await b.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
