import { expect, type Page, test } from '@playwright/test';

test('home serves readable agent documentation and links to Sapien', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('AGENTINBOX.MDThe inbox API for agents');
  await expect(page.locator('#install-panel-cli')).toHaveText('npm install -g @agentinbox/cli');
  await page.getByRole('tab', { name: 'MCP' }).click();
  await expect(page.locator('#install-panel-mcp')).toHaveText('https://mcp.agentinbox.md');
  await expect(page.locator('#install-panel-cli')).toBeHidden();
  await expect(page.locator('#quickstart')).toContainText('agentinbox send "Build finished — 0 failures." --via email');
  await expect(page.locator('#quickstart')).toContainText('agentinbox reply conv_123 "On it."');
  await expect(page.locator('#flags')).toContainText('--to <id|email>[,...]');
  await expect(page.locator('#contacts')).toContainText('agentinbox contact list --limit 20 --after <cursor>');
  await page.getByRole('link', { name: 'agentinbox.md/sapien' }).click();
  await expect(page).toHaveURL(/\/sapien$/);
  await page.getByRole('navigation', { name: 'Header navigation' }).getByRole('link', { name: 'for robots' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test('legacy human-readable URL reaches Sapien', async ({ page }) => {
  await page.goto('/sapien.html');
  await expect(page).toHaveURL(/\/sapien$/);
});

test('home inline commands copy as one valid command', async ({ page }) => {
  await page.goto('/');
  const command = page.locator('#how-it-works code').filter({
    hasText: 'agentinbox contact invite',
  });
  const selected = await command.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const text = selection.toString();
    selection.removeAllRanges();
    return text;
  });
  expect(selected).toBe('agentinbox contact invite');
});

for (const width of [320, 390, 768, 1024, 1440, 1920, 2560]) {
  test(`home content stays readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const bounds = await page.locator('main').evaluate((main) => {
      const nodes = Array.from(main.querySelectorAll('h1, h2, p, code, dt, dd, a'));
      return nodes.flatMap((node) => {
        const rect = node.getBoundingClientRect();
        return rect.left < -1 || rect.right > window.innerWidth + 1 ? [node.textContent] : [];
      });
    });
    expect(bounds).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

for (const width of [320, 768, 1920]) {
  test(`home words remain readable with increased text spacing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.addStyleTag({
      content:
        '* { letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.5 !important; } p { margin-bottom: 2em !important; }',
    });
    const overflow = await page.locator('main .home-prose-word').evaluateAll((words) =>
      words.flatMap((word) => {
        const range = document.createRange();
        range.selectNodeContents(word);
        const bounds = word.getBoundingClientRect();
        const outside = Array.from(range.getClientRects()).some(
          (text) => text.right > bounds.right + 1 || text.left < bounds.left - 1
        );
        return outside ? [word.textContent] : [];
      })
    );
    expect(overflow).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('#how-it-works')).toContainText('agentinbox contact invite');
    await expect(page.locator('#auth')).toHaveCount(0);
  });
}

const MASCOT = 'Agent Inbox mascot';
const MASCOT_IMAGE = /\/illustrations\/mascot-waiting\.svg$/;
const artworkCanvas = (page: Page) => page.locator('.home-artwork canvas');

/** A hash of the canvas over the face, where the eyes move. */
function canvasFrame(page: Page) {
  return artworkCanvas(page).evaluate((node: HTMLCanvasElement) => {
    const { data } = node
      .getContext('2d')!
      .getImageData(
        Math.round(node.width * 0.25),
        Math.round(node.height * 0.25),
        Math.round(node.width * 0.3),
        Math.round(node.height * 0.3)
      );
    let hash = 0;
    for (let index = 0; index < data.length; index += 4) hash = (hash * 31 + data[index] + data[index + 3]) | 0;
    return hash;
  });
}

test('the mascot turns toward the pointer and has no playback controls', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await expect(page.getByRole('figure', { name: MASCOT })).toBeVisible();
  await expect(artworkCanvas(page)).toBeVisible();
  await expect.poll(() => canvasFrame(page)).not.toBe(0);
  await page.mouse.move(40, 40);
  const resting = await canvasFrame(page);
  await page.mouse.move(1500, 420);
  await expect.poll(() => canvasFrame(page)).not.toBe(resting);
  await expect(page.locator('.home-artwork button')).toHaveCount(0);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(artworkCanvas(page)).toBeVisible();
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`the mascot has a pane of its own at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const artwork = page.locator('.home-artwork');
    const pane = (await artwork.boundingBox())!;
    const document = (await page.locator('main').boundingBox())!;
    // The pane runs from beside the document to the window's right edge, the window's full height.
    expect(pane.x).toBeGreaterThanOrEqual(document.x + document.width + 60);
    expect(pane.x + pane.width).toBeCloseTo(viewport.width, 0);
    expect(pane.y).toBeCloseTo(0, 0);
    expect(pane.height).toBeCloseTo(viewport.height, 0);
    const stage = (await page.locator('.home-artwork-stage').boundingBox())!;
    expect(Math.abs(stage.x + stage.width / 2 - (pane.x + pane.width / 2))).toBeLessThanOrEqual(1);
    expect(stage.y + stage.height / 2).toBeCloseTo(viewport.height / 2, 0);
    const bubble = (await page.locator('.home-bubble').boundingBox())!;
    expect(bubble.x).toBeGreaterThan(pane.x);
    expect(bubble.x + bubble.width).toBeLessThan(viewport.width);
    // It stays put while the document scrolls.
    await page.locator('footer').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect((await artwork.boundingBox())!.y).toBeCloseTo(0, 0);
  });
}

test('reduced motion keeps the mascot still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(artworkCanvas(page)).toBeVisible();
  await expect.poll(() => canvasFrame(page)).not.toBe(0);
  const still = await canvasFrame(page);
  await page.mouse.move(20, 20);
  await page.mouse.move(1400, 400);
  await page.waitForTimeout(300);
  expect(await canvasFrame(page)).toBe(still);
});

test('the mascot is drawn for paper, without the dark exported drawing', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => {
    if (MASCOT_IMAGE.test(request.url())) requested.push(request.url());
  });
  await page.goto('/');
  await expect(artworkCanvas(page)).toBeVisible();
  await expect.poll(() => canvasFrame(page)).not.toBe(0);
  expect(requested).toEqual([]);
});

for (const width of [390, 1024]) {
  test(`the mascot scrolls away with the hero at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const artwork = page.locator('.home-artwork');
    await expect(artworkCanvas(page)).toBeVisible();
    const before = (await artwork.boundingBox())!;
    await page.locator('footer').scrollIntoViewIfNeeded();
    const after = (await artwork.boundingBox())!;
    expect(after.y).toBeLessThan(before.y);
  });
}

test('home documentation and artwork work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('figure', { name: MASCOT })).toBeVisible();
  await expect(page.locator('#contacts')).toContainText('carol@acme.com');
  await page.getByRole('link', { name: 'agentinbox.md/sapien' }).click();
  await expect(page).toHaveURL(/\/sapien$/);
  await context.close();
});
