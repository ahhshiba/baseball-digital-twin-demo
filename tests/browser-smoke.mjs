// Optional browser acceptance check. Install Playwright locally or set PLAYWRIGHT_MODULE.
// DEMO_URL selects the page (default: local vite preview); BROWSER_CHANNEL=msedge uses Edge.
import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL,headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1512,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const url=process.env.DEMO_URL||'http://127.0.0.1:5174/baseball-digital-twin-demo/';
const noOverflow=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
await mkdir('artifacts',{recursive:true});
try {
  await page.goto(url);await page.waitForSelector('#scene canvas');
  // Public layer: no budget, A/B plan or research-option controls.
  for(const gone of ['[data-variant]','#option-fpga','#option-radar60','#stage-brief','[data-panel="plan"]'])assert.equal(await page.locator(gone).count(),0,gone);
  assert.doesNotMatch(await page.locator('.app').textContent(),/NT\$|萬 NTD|預算|報價/);
  const expected={bullpen:9,pilot:11,full:19};
  for(const scene of ['bullpen','pilot','full'])for(const panel of ['nodes','theory','replay']){
    await page.goto(`${url}#${scene}/${panel}`);await page.waitForSelector('#node-list .node',{state:'attached'});
    assert.equal(await page.locator(`[data-scene="${scene}"]`).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator(`#tab-${panel}`).getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('#node-list .node').count(),expected[scene],`${scene} device count`);
  }
  await page.goto(`${url}#bullpen/nodes`);await page.waitForSelector('#node-list .node');
  await page.locator('[data-node="cam-c"]').click();
  assert.match(await page.locator('#detail .purpose').textContent(),/球縫/);
  await page.locator('#detail-theory').click();assert.equal(await page.locator('#tab-theory').getAttribute('aria-selected'),'true');
  await page.locator('[data-theory="radar"]').click();await page.locator('[data-panel="nodes"]').click();
  assert.equal(await page.locator('[data-node="r24"]').getAttribute('class'),'node chosen');
  await page.screenshot({path:'artifacts/bullpen.png'});
  await page.locator('[data-panel="replay"]').click();await page.locator('[data-pitch="SL"]').click();
  await page.locator('#situation').selectOption('occluded');assert.match(await page.locator('#decision').textContent(),/待覆核/);
  await page.locator('#play').click();await page.waitForFunction(()=>!document.querySelector('#play').disabled,null,{timeout:6000});
  await page.locator('#ghost-actors').click();assert.equal(await page.locator('#scene').getAttribute('data-pitcher-opacity'),'0.25');
  await page.locator('#ghost-actors').click();assert.equal(await page.locator('#scene').getAttribute('data-pitcher-opacity'),'1');
  await page.locator('[data-scene="full"]').click();await page.locator('[data-panel="replay"]').click();
  assert.equal(await page.locator('#field-timeline').isVisible(),true);
  await page.locator('[data-scenario="fly-catch"]').click();await page.locator('#field-play').click();
  await page.locator('#field-scrub').fill('40');assert.match(await page.locator('#fielding-outcome').textContent(),/尚未發生/);
  await page.locator('#field-scrub').fill('110');assert.match(await page.locator('#fielding-outcome').textContent(),/出局/);
  await page.locator('[data-scenario="id-ambiguity"]').click();await page.locator('#field-play').click();await page.locator('#field-scrub').fill('85');
  assert.match(await page.locator('#fielding-summary').textContent(),/身分待覆核 2/);
  await page.locator('[data-scenario="occlusion"]').click();await page.locator('#field-play').click();await page.locator('#field-scrub').fill('32');
  assert.match(await page.locator('#fielding-summary').textContent(),/遮擋 1/);
  await page.screenshot({path:'artifacts/full-replay.png'});
  await page.goto(url.split('#')[0]+'#build/poc/plan');await page.waitForSelector('#node-list .node',{state:'attached'});
  assert.equal(await page.locator('#tab-theory').getAttribute('aria-selected'),'true');
  await page.setViewportSize({width:390,height:844});
  for(const scene of ['bullpen','full'])for(const panel of ['nodes','theory','replay']){
    await page.locator(`[data-scene="${scene}"]`).click();await page.locator(`[data-panel="${panel}"]`).click();
    assert.ok(await noOverflow(),`mobile overflow on ${scene}/${panel}`);
  }
  await page.screenshot({path:'artifacts/mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,url,routes:9,scenes:3,panels:3,fieldingScenarios:6,browserErrors:errors,mobileOverflow:false}));
} finally {await browser.close()}
