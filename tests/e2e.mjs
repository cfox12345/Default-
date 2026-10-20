// End-to-end check of the acceptance criteria in a phone-sized browser.
// Usage: start a static server on the repo root, then
//   BASE_URL=http://localhost:8080 node tests/e2e.mjs
import { chromium, devices } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const SHOTS = process.env.SCREENSHOT_DIR || 'tests/screenshots';
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined;
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
function check(cond, msg) {
  if (cond) console.log('  ✓', msg);
  else { failures++; console.log('  ✗', msg); }
}

async function noHorizontalScroll(page, label) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(sw <= cw, `${label}: no horizontal scroll (${sw} <= ${cw})`);
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const context = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

console.log('Home');
await page.goto(BASE + '/');
await page.waitForSelector('.day-card');
const cards = await page.locator('.day-card').allInnerTexts();
check(cards.length === 4, `4 day cards (${cards.length})`);
for (const day of ['Tue', 'Wed', 'Thu', 'Fri']) check(cards.some((c) => c.toLowerCase().startsWith(day.toLowerCase())), `card for ${day}`);
check(await page.locator('.day-card .pill-accent', { hasText: 'Today' }).count() <= 1, 'at most one Today marker');
await page.screenshot({ path: `${SHOTS}/01-home.png`, fullPage: true });
await noHorizontalScroll(page, 'home');

console.log('Open Tuesday, log sets');
await page.locator('.day-card', { hasText: 'Full-body baseline A' }).click();
await page.waitForSelector('.ex-card');
check((await page.locator('.ex-card').count()) === 6, '6 exercise cards on Tuesday');
check(await page.locator('.ex-card .ex-suggest').first().isVisible(), 'suggested load visible');
check((await page.locator('.ex-card .ex-safety').count()) > 0, 'safety notes visible');
check((await page.locator('.ex-card .ex-sub').count()) > 0, 'substitutions visible');
const weightValues = await page.locator('.weight-cell input').evaluateAll((els) => els.map((e) => e.value));
check(weightValues.every((v) => v === ''), 'no load is prefilled from an assumed weight');

const progressText = () => page.locator('.wk-progress-text').innerText();
check((await progressText()).startsWith('0%'), 'progress starts at 0%');

const ex1 = page.locator('#ex-sit-to-stand');
await ex1.locator('.set-check').nth(0).click();
check((await progressText()).startsWith('8%'), `progress updates after one set (${await progressText()})`);
check((await ex1.locator('.reps-input').nth(0).inputValue()) === '8', 'reps prefilled with target on check');
check((await ex1.locator('.ex-count').innerText()) === '1/2', 'card count updates');
// fewer reps than target are retained
await ex1.locator('.reps-input').nth(1).fill('6');
await ex1.locator('.set-check').nth(1).click();
check((await ex1.locator('.reps-input').nth(1).inputValue()) === '6', 'actual reps (6) kept instead of target');

const rdl = page.locator('#ex-db-rdl');
await rdl.locator('.weight-cell input').nth(0).fill('8');
await rdl.locator('.set-check').nth(0).click();
await rdl.locator('.set-check').nth(1).click();
check((await rdl.locator('.weight-cell input').nth(1).inputValue()) === '8', 'set 2 carries set 1 load from this session');
await rdl.locator('.note-btn').nth(1).click();
await rdl.locator('.set-note input').nth(1).fill('back felt fine');

// unit switch to band on press set 1
const press = page.locator('#ex-incline-db-press');
await press.locator('.unit-select').nth(0).selectOption('band');
await press.locator('.weight-cell input').nth(0).fill('light');

// skip with reason
const row = page.locator('#ex-chest-supported-row');
await row.getByRole('button', { name: 'Skip exercise' }).click();
await page.locator('#ex-chest-supported-row input[type=text]').fill('neck tight');

// warm-up checklist
await page.locator('.checklist .check-item').first().click();

// summary
const summary = page.locator('#session-summary');
await summary.locator('.scale').nth(0).getByRole('button', { name: '5', exact: true }).click();
await summary.locator('.scale').nth(1).getByRole('button', { name: '2', exact: true }).click();
await summary.getByRole('button', { name: 'About the same' }).click();
await page.locator('#note-neck').fill('Mild trap tension, no arm symptoms');
await page.locator('#note-feet').fill('OK');
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOTS}/02-workout.png`, fullPage: true });
await noHorizontalScroll(page, 'workout');
const urlWithSession = page.url();
check(/#\/w\/w1-tue\/[a-z0-9]+$/.test(urlWithSession), 'URL pinned to the stored session');

console.log('Persistence after reload');
await page.reload();
await page.waitForSelector('.ex-card');
check((await page.locator('#ex-sit-to-stand .reps-input').nth(1).inputValue()) === '6', 'reps persisted');
check((await page.locator('#ex-db-rdl .weight-cell input').nth(0).inputValue()) === '8', 'weight persisted');
check(await page.locator('#ex-db-rdl .set-note input').nth(1).isVisible(), 'set note shown after reload');
check((await page.locator('#ex-incline-db-press .unit-select').nth(0).inputValue()) === 'band', 'band unit persisted');
check((await page.locator('#ex-chest-supported-row .ex-count').innerText()) === 'Skipped', 'skip persisted');
check((await page.locator('#ex-chest-supported-row input[type=text]').inputValue()) === 'neck tight', 'skip reason persisted');
check((await page.locator('#note-neck').inputValue()).startsWith('Mild trap'), 'notes persisted');
check((await summary.locator('.scale').nth(0).locator('[aria-pressed=true]').innerText()) === '5', 'effort persisted');
check((await summary.locator('.scale').nth(1).locator('[aria-pressed=true]').innerText()) === '2', 'pain persisted');
check((await summary.locator('.seg-btn[aria-pressed=true]').innerText()) === 'About the same', 'next morning persisted');
check((await page.locator('.checklist .check-item').first().getAttribute('aria-pressed')) === 'true', 'warm-up check persisted');

console.log('Finish & history');
await summary.getByRole('button', { name: 'Finish session' }).click();
await page.waitForSelector('.banner');
check(await page.locator('.banner').isVisible(), 'completed banner shown');
await page.goto(BASE + '/#/');
await page.waitForSelector('.day-card');
check((await page.locator('.day-card', { hasText: 'baseline A' }).locator('.status-done').count()) === 1, 'Tuesday card shows Done');

// Friday shares the sit-to-stand id → should show previous numbers
await page.locator('.day-card', { hasText: 'Travel-day reset' }).click();
await page.waitForSelector('#ex-sit-to-stand');
const last = await page.locator('#ex-sit-to-stand .ex-last').innerText();
check(/BW × 8/.test(last) && /BW × 6/.test(last), `Friday shows last sit-to-stand numbers (${last.replace(/\n/g, ' ')})`);
await page.screenshot({ path: `${SHOTS}/03-friday.png`, fullPage: true });
// Opening Friday without logging must not create a session
await page.goto(BASE + '/#/history');
await page.waitForSelector('.session-row');
check((await page.locator('.session-row').count()) === 1, 'history lists exactly the one logged session');
const histRow = await page.locator('.session-row').innerText();
check(/Effort 5/.test(histRow) && /Pain 2/.test(histRow) && /about the same/.test(histRow), 'history row shows effort, pain, next AM');
await page.locator('.ex-history summary', { hasText: 'Dumbbell Romanian deadlift' }).click();
check(/8 lb × 8 · 8 lb × 8/.test(await page.locator('.ex-history[open]').innerText()), 'exercise history shows logged RDL numbers');
// body weight
await page.locator('.bw-card summary').click();
await page.locator('.bw-form input[inputmode=decimal]').fill('179.6');
await page.locator('.bw-form').getByRole('button', { name: 'Add' }).click();
await page.waitForSelector('.bw-list li');
check(/179.6 lb/.test(await page.locator('.bw-list').innerText()), 'weekly weigh-in saved');
await page.screenshot({ path: `${SHOTS}/04-history.png`, fullPage: true });
await noHorizontalScroll(page, 'history');
await page.locator('.session-row').first().click();
await page.waitForSelector('#ex-db-rdl');
check((await page.locator('#ex-db-rdl .weight-cell input').nth(0).inputValue()) === '8', 'previous session reopens with numbers');

console.log('Export');
await page.goto(BASE + '/#/data');
await page.waitForSelector('.btn-stack');
let [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup (JSON)' }).click()]);
const json = JSON.parse(readFileSync(await dl.path(), 'utf8'));
check(json.sessions.length === 1 && json.bodyWeightLogs.length === 1, 'JSON export contains session and weigh-in');
check(json.sessions[0].exercises['db-rdl'].sets[0].actualWeight === '8', 'JSON export has set weight');
[dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download sets (CSV)' }).click()]);
const csv = readFileSync(await dl.path(), 'utf8');
check(csv.startsWith('session_date,') && /db-rdl,Dumbbell Romanian deadlift,no,,2,yes,8,lb,8,back felt fine/.test(csv), 'CSV export has set rows');
check(/chest-supported-row,.*,yes,neck tight/.test(csv), 'CSV export has skip reason');
await page.screenshot({ path: `${SHOTS}/05-data.png`, fullPage: true });
await noHorizontalScroll(page, 'data');

console.log('Reset requires confirmation');
await page.goto(urlWithSession);
await page.waitForSelector('.ex-card');
await page.getByRole('button', { name: 'Reset this workout' }).click();
check(await page.locator('#confirm-dialog').isVisible(), 'confirm dialog opens');
await page.screenshot({ path: `${SHOTS}/06-confirm.png` });
await page.locator('#confirm-dialog').getByRole('button', { name: 'Cancel' }).click();
check((await page.locator('#ex-db-rdl .weight-cell input').nth(0).inputValue()) === '8', 'cancel keeps data');
await page.getByRole('button', { name: 'Reset this workout' }).click();
await page.locator('#confirm-ok').click();
await page.waitForFunction(() => location.hash.endsWith('/new'));
await page.waitForSelector('.ex-card');
check((await page.locator('#ex-db-rdl .weight-cell input').nth(0).inputValue()) === '', 'reset clears the session');
check((await page.locator('.wk-progress-text').innerText()).startsWith('0%'), 'progress back to 0%');

console.log('Restore backup');
await page.goto(BASE + '/#/data');
await page.waitForSelector('#restore-file', { state: 'attached' });
await page.locator('#restore-file').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });
await page.locator('#confirm-ok').click();
await page.waitForSelector('.toast.is-visible');
await page.goto(BASE + '/#/history');
await page.waitForSelector('.session-row');
check((await page.locator('.session-row').count()) === 1, 'restored session appears in history');

console.log('Clear all data');
await page.goto(BASE + '/#/data');
await page.getByRole('button', { name: 'Delete all local data' }).click();
await page.locator('#confirm-dialog').getByRole('button', { name: 'Cancel' }).click();
check(await page.evaluate(() => !!localStorage.getItem('skiSeasonFitness.v1')), 'cancel keeps local data');
await page.getByRole('button', { name: 'Delete all local data' }).click();
await page.locator('#confirm-ok').click();
await page.waitForSelector('.toast.is-visible');
await page.goto(BASE + '/#/history');
await page.waitForSelector('.view .card');
check(await page.locator('.empty').isVisible(), 'history empty after delete');

console.log('Narrow width (320px)');
const small = await browser.newContext({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const sp = await small.newPage();
for (const route of ['#/', '#/w/w1-tue', '#/w/w1-wed', '#/w/w1-thu', '#/w/w1-fri', '#/history', '#/data']) {
  await sp.goto(`${BASE}/${route}`);
  await sp.waitForTimeout(150);
  await noHorizontalScroll(sp, `320px ${route}`);
}
await sp.goto(`${BASE}/#/w/w1-thu`);
await sp.waitForSelector('.ex-card');
await sp.screenshot({ path: `${SHOTS}/07-thursday-320.png`, fullPage: true });

console.log('Offline after first load');
await page.goto(BASE + '/');
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await context.setOffline(true);
await page.reload();
await page.waitForSelector('.day-card', { timeout: 5000 }).catch(() => {});
check((await page.locator('.day-card').count()) === 4, 'app loads offline');
await context.setOffline(false);

check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
