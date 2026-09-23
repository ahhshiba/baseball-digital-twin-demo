// Optional browser acceptance check. Install Playwright locally or set PLAYWRIGHT_MODULE.
import { pathToFileURL } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1512,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=process.env.DEMO_URL||'http://127.0.0.1:5174/baseball-digital-twin-demo/';
await mkdir('artifacts',{recursive:true});
try {
  await page.goto(url);await page.waitForSelector('#scene canvas');await page.waitForFunction(()=>document.querySelector('#hud-type')?.textContent.includes('FF'));
  await page.locator('#clearance').click();assert.equal(await page.locator('#clearance').getAttribute('aria-pressed'),'true');
  await page.locator('[data-panel="nodes"]').click();await page.locator('[data-node="cam-c"]').click();
  assert.ok((await page.locator('#detail').textContent()).includes('三壘側看台'));
  assert.ok((await page.locator('#detail').textContent()).includes('x -32'));
  await page.screenshot({path:'artifacts/perimeter-mounts.png'});
  await page.locator('[data-panel="dashboard"]').click();await page.locator('#clearance').click();
  await page.screenshot({path:'artifacts/stadium.png'});
  await page.locator('[data-view="plate"]').click();await page.screenshot({path:'artifacts/plate.png'});
  for(const stage of ['poc','bullpen','pilot','full']){
    await page.locator(`[data-stage="${stage}"]`).click();
    assert.ok(await page.locator('#node-list .node').count()>=5);
    if(stage==='poc'){
      await page.locator('[data-site="lab"]').click();await page.locator('[data-scene="near"]').click();
      await page.screenshot({path:'artifacts/lab.png'});
    }
  }
  await page.locator('#light').click();await page.locator('#coverage').click();
  await page.screenshot({path:'artifacts/night.png'});
  await page.locator('#light').click();await page.locator('#coverage').click();
  for(const [scenario,expected] of [['ball','示範壞球'],['edge','待覆核'],['occluded','待覆核'],['strike','示範好球']]){
    await page.locator('#scenario').selectOption(scenario);assert.ok((await page.locator('#decision').textContent()).includes(expected));
  }
  await page.locator('#height').fill('195');await page.locator('#height').blur();
  assert.ok((await page.locator('#zone-meta').textContent()).includes('195'));
  await page.locator('[data-pitch="SL"]').click();await page.locator('#play').click();
  await page.waitForFunction(()=>!document.querySelector('#play').disabled);
  assert.ok((await page.locator('#record-count').textContent()).includes('1 球'));
  const jsonDownload=page.waitForEvent('download');await page.locator('#export-json').click();
  const jsonFile=await jsonDownload,records=JSON.parse(await readFile(await jsonFile.path(),'utf8')).records;
  assert.equal(records[0].pitch_type.label,'SL');assert.equal(records[0].source,'synthetic');assert.equal(records[0].trajectory.samples.length,241);
  const csvDownload=page.waitForEvent('download');await page.locator('#export-csv').click();const csv=await csvDownload;
  assert.ok((await readFile(await csv.path(),'utf8')).includes('user-selected-demo'));
  await page.reload();await page.waitForSelector('#record-count');assert.ok((await page.locator('#record-count').textContent()).includes('1 球'));
  await page.locator('[data-panel="metrics"]').click();assert.equal(await page.locator('.capability').count(),10);
  await page.locator('.capability summary').first().click();
  await page.locator('[data-panel="nodes"]').click();await page.locator('[data-node="r24"]').click();
  assert.ok((await page.locator('#detail').textContent()).includes('I/Q'));
  await page.locator('[data-panel="flow"]').click();assert.equal(await page.locator('.flow-list>div').count(),5);
  await page.locator('[data-panel="dashboard"]').click();
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,url,scenarios:4,stages:4,downloads:['JSON','CSV'],browserErrors:errors,mobileOverflow:false}));
} finally {await browser.close()}
