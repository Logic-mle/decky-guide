import assert from 'node:assert/strict';
const { chromium } = await import(process.env.DECKY_PLAYWRIGHT_PATH || 'playwright');
const browser = await chromium.launch({ headless:true, executablePath: process.env.DECKY_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('http://127.0.0.1:4173');
const action = (name) => page.getByRole('button', { name, exact:true });
const body = page.locator('.dg-body');
const scroller = page.locator('#root > div');
await page.getByText('1 / 120').waitFor();
assert.equal(await body.evaluate((node) => node.scrollHeight > node.clientHeight + 1), false, 'No nested scroll pane');
assert.ok(await body.evaluate((node) => node.clientHeight) > 1000, 'Article uses natural full height');
assert.equal(await body.evaluate((node) => getComputedStyle(node).fontSize), '14px');
await page.screenshot({path:'out/preview/reader.png'});
await action('章节目录').click();
await page.getByRole('textbox', {name:'搜索章节'}).fill('第10章');
assert.equal(await page.locator('.dg-chapter').count(), 1);
await page.screenshot({path:'out/preview/chapters.png'});
await page.locator('.dg-chapter').click();
await page.getByText('10 / 120').waitFor();
assert.equal(await page.getByRole('textbox').count(), 0);
assert.ok(await scroller.evaluate((node) => node.scrollTop) < 100);
// Native direction events must remain unconsumed, so Steam can perform navigation.
for (const button of [9,10,11,12]) {
 const allowed = await page.locator('.dg-body .dg-block').first().evaluate((node, button) => node.dispatchEvent(new CustomEvent('test-gamepad', { bubbles:true, cancelable:true, detail:{button} })), button);
 assert.equal(allowed,true);
}
await scroller.evaluate((node) => { node.dispatchEvent(new Event('wheel')); node.scrollTop = 900; });
await page.waitForTimeout(450);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('decky-guide.reading.v1'))['game:preview']);
assert.ok(saved.position.block > 0);
await page.reload();
await page.getByText('10 / 120').waitFor();
await page.waitForTimeout(150);
assert.ok(Math.abs(await scroller.evaluate((node) => node.scrollTop) - 900) < 10, 'Native scroller position restored');
// Sticky tools remain visible deep in the native scroller; shoulder keys page the body.
const tools = page.locator('.dg-reading-tools');
assert.equal(await tools.locator('.dg-row').first().getAttribute('flow-children'), 'row');
assert.ok(await tools.evaluate((node) => { const top=node.getBoundingClientRect().top; return top >= 0 && top <= 24; }));
const beforeShoulder = await scroller.evaluate((node) => node.scrollTop);
await page.locator('.dg-reader').first().evaluate((node) => node.dispatchEvent(new CustomEvent('test-gamepad', {bubbles:true,cancelable:true,detail:{button:6}})));
await page.waitForTimeout(450);
const duringHold = await scroller.evaluate((node) => node.scrollTop);
await page.evaluate(() => {
 window.releaseFocusCalls = 0;
 const original = HTMLElement.prototype.focus;
 window.restoreFocusSpy = () => { HTMLElement.prototype.focus = original; };
 HTMLElement.prototype.focus = function(...args) { window.releaseFocusCalls++; return original.apply(this, args); };
});
assert.ok(duringHold > beforeShoulder + 100 && duringHold < beforeShoulder + 260);
await page.locator('.dg-reader').first().evaluate((node) => node.dispatchEvent(new CustomEvent('test-gamepad', {bubbles:true,cancelable:true,detail:{button:6,release:true}})));
const stopped = await scroller.evaluate((node) => node.scrollTop);
await page.waitForTimeout(500);
assert.ok(Math.abs(await scroller.evaluate((node) => node.scrollTop) - stopped) < 3);
assert.equal(await page.evaluate(() => window.releaseFocusCalls), 0, 'Release must not reposition focus');
await page.evaluate(() => window.restoreFocusSpy());
assert.ok(await page.getByText('10 / 120').count() === 1, 'Shoulder does not change chapters');
await page.locator('.dg-reader').first().evaluate((node) => node.dispatchEvent(new CustomEvent('test-gamepad', {bubbles:true,cancelable:true,detail:{button:5}})));
await page.waitForTimeout(300);
await page.locator('.dg-reader').first().evaluate((node) => node.dispatchEvent(new CustomEvent('test-gamepad', {bubbles:true,cancelable:true,detail:{button:5,release:true}})));
assert.ok(await scroller.evaluate((node) => node.scrollTop) < stopped - 60);
await action('章节目录').click();
assert.ok(await page.getByRole('textbox', {name:'搜索章节'}).isVisible());
assert.ok(await page.getByRole('textbox').evaluate((node) => node.getBoundingClientRect().top) < 180);
await page.screenshot({path:'out/preview/sticky-directory.png'});
await action('收起目录').click();
// X/Y open tools from deep in the article, move focus inside, and ignore repeat events.
const shortcut = async (button, repeat=false) => page.locator('.dg-reader').first().evaluate((node, detail) => node.dispatchEvent(new CustomEvent('test-gamepad',{bubbles:true,cancelable:true,detail})), {button,is_repeat:repeat});
await shortcut(3);
await page.waitForTimeout(50);
assert.ok(await page.getByRole('textbox', {name:'搜索章节'}).isVisible());
assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('.dg-tool-panel'))),true);
await shortcut(3,true);
assert.ok(await page.getByRole('textbox', {name:'搜索章节'}).isVisible());
await shortcut(4);
await page.waitForTimeout(50);
assert.equal(await page.getByRole('textbox').count(),0);
assert.ok(await action('标准').isVisible());
assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('.dg-tool-panel'))),true);
await shortcut(4);
assert.equal(await action('标准').count(),0);
// Settings open beneath the sticky toolbar without shrinking the article.

await action('阅读设置').click();
await action('大').click();
assert.equal(await body.evaluate((node) => getComputedStyle(node).fontSize),'18px');
await action('阅读设置').click();
await page.evaluate(() => { window.testMode = 'fail'; });
await action('下一页 ›').click();
await page.getByRole('alert').waitFor();
assert.ok(await page.getByText('10 / 120').isVisible());
await page.evaluate(() => { window.testMode = ''; });
await action('重试').click();
await page.getByText('11 / 120').waitFor();
await page.locator('.dg-image').first().click();
await page.getByRole('dialog').waitFor();
await action('放大至 200%').click();
await action('图片向右移动').click();
assert.ok(await page.locator('.dg-image-viewport').evaluate((node) => node.scrollLeft) > 0);
await action('返回正文').click();
// Out-of-order requests cannot replace the new page.
await page.evaluate(() => { window.testMode='race'; window.dispatchEvent(new CustomEvent('test-navigate',{detail:'https://www.gamersky.com/handbook/202609/123_2.shtml'})); });
await page.waitForTimeout(80);
await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-navigate',{detail:'https://www.gamersky.com/handbook/202609/123_3.shtml'})));
await page.getByText('3 / 120').waitFor();
await page.waitForTimeout(750);
assert.ok(await page.getByText('3 / 120').isVisible());
for (const [width,height] of [[320,800],[280,720]]) {
 await page.setViewportSize({width,height});
 await scroller.evaluate((node) => { node.dispatchEvent(new Event('wheel')); node.scrollTop=0; });
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
 await page.screenshot({path:`out/preview/flow-${width}.png`});
}
// Test the actual result content under Steam-like light focused button styling.
await page.goto('http://127.0.0.1:4173/?results');
await page.locator('.test-result').first().focus();
const colors = await page.locator('.test-result').first().evaluate((node) => {
 const content = node.firstElementChild;
 return Array.from(content.children).map((child) => getComputedStyle(child).color);
});
assert.deepEqual(colors, ['rgb(32, 37, 48)','rgb(32, 37, 48)','rgb(32, 37, 48)']);
assert.ok(await page.locator('.test-result').first().evaluate((node) => node.clientHeight) < 210);
await page.screenshot({path:'out/preview/result-focus.png'});
assert.deepEqual(errors,[]);
console.log('Passed: flowing layout, native scroll restoration, unconsumed direction events, chapter search, font size, retry, image pan, stale requests, focus text contrast and narrow widths. Steam focus navigation still requires device testing.');
} finally { await browser.close(); }
