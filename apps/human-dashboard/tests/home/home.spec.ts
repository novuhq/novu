import { expect, type Page, test } from '@playwright/test';
import sharp from 'sharp';

test('home serves readable agent documentation and links to Sapien', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('agentinbox.mdThe inbox API for agents');
  await expect(page.locator('#install code')).toHaveText('npm install -g @agentinbox/cli');
  await expect(page.locator('#usage')).toContainText(
    'npx @agentinbox/cli inbox send choose "Pick a release strategy" --option canary --option blue-green'
  );
  await expect(page.locator('#flags')).toContainText('--to <id|email>[,...]');
  await expect(page.locator('#contacts')).toContainText('npx @agentinbox/cli contact list --limit 20 --after <cursor>');
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
    hasText: 'channel default slack',
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
  expect(selected).toBe('channel default slack');
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
    await expect(page.locator('#how-it-works')).toContainText('channel default slack');
    await expect(page.locator('#auth')).toContainText('INBOX_SECRET_KEY');
  });
}

const POSTER_ALT = "Dithered illustration of a robot arm holding an agent's card";
const SOURCE_IMAGE = /\/media\/home\/agentinbox-dither\.png$/;
const artworkCanvas = (page: Page) => page.locator('.home-artwork canvas');

/** A hash of the canvas around the orange pin, where the dither animates. */
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

test('home artwork animates without playback controls', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await expect(artworkCanvas(page)).toBeVisible();
  await expect(page.getByAltText(POSTER_ALT)).toBeHidden();
  const first = await canvasFrame(page);
  await expect.poll(() => canvasFrame(page)).not.toBe(first);
  await expect(page.locator('.home-artwork button')).toHaveCount(0);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(artworkCanvas(page)).toBeVisible();
  const scrolled = await canvasFrame(page);
  await expect.poll(() => canvasFrame(page)).not.toBe(scrolled);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1440, height: 720 },
  { width: 1920, height: 1080 },
  { width: 1920, height: 480 },
]) {
  test(`home artwork stays Figma-aligned while fixed at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const artwork = page.locator('.home-artwork');
    const before = (await artwork.boundingBox())!;
    const document = (await page.locator('main').boundingBox())!;
    // Figma: the canvas starts right of the document column and overhangs the
    // right edge by 216/1323 of its width.
    expect(before.x).toBeGreaterThanOrEqual(document.x + document.width + 12);
    expect(before.x + before.width - viewport.width).toBeCloseTo((before.width * 216) / 1323, 0);
    // Its drawing (x 22–79%, from 20.7% of the width below the canvas top to
    // 61.6%) starts level with the description at y = 348, unless a short
    // window would cut it off, and stays in view.
    const drawing = {
      top: before.y + before.width * 0.207,
      bottom: before.y + before.width * 0.616,
      right: before.x + before.width * 0.8,
    };
    if (viewport.height >= 720) expect(drawing.top).toBeCloseTo(348, 0);
    expect(drawing.top).toBeGreaterThanOrEqual(0);
    expect(drawing.bottom).toBeLessThanOrEqual(viewport.height - 15);
    expect(drawing.right).toBeLessThanOrEqual(viewport.width);
    const isFigmaViewport = viewport.width === 1920 && viewport.height === 1080;
    if (isFigmaViewport) {
      expect(before.x).toBeCloseTo(813, 0);
      expect(before.y).toBeCloseTo(74, 0);
      expect(before.width).toBeCloseTo(1323, 0);
      expect(before.height).toBeCloseTo(1135, 0);
      expect(await page.getByAltText(POSTER_ALT).boundingBox()).toEqual(before);
    }
    await page.locator('footer').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const after = (await artwork.boundingBox())!;
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.y).toBeCloseTo(before.y, 0);
    if (isFigmaViewport) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(artworkCanvas(page)).toBeVisible();
      expect(await artworkCanvas(page).boundingBox()).toEqual(after);
    }
  });
}

for (const background of ['#fbfbfb', '#eef0f2']) {
  test(`home artwork background matches the page on ${background}`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.addStyleTag({
      content: `.home-page { --home-background: ${background}; }`,
    });
    const bounds = (await page.locator('.home-artwork').boundingBox())!;
    async function pixel(x: number) {
      const png = await page.screenshot({
        clip: { x, y: bounds.y + 8, width: 1, height: 1 },
      });
      return Array.from(await sharp(png).removeAlpha().raw().toBuffer());
    }
    const paper = await pixel(bounds.x - 8);
    expect(await pixel(bounds.x + 8)).toEqual(paper);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(artworkCanvas(page)).toBeVisible();
    expect(await pixel(bounds.x + 8)).toEqual(paper);
  });
}

test('home reduced motion shows the static artwork without loading the effect', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sources: string[] = [];
  page.on('request', (request) => {
    if (SOURCE_IMAGE.test(request.url())) sources.push(request.url());
  });
  await page.goto('/');
  const poster = page.getByAltText(POSTER_ALT);
  await expect(poster).toBeVisible();
  await expect(artworkCanvas(page)).toHaveCount(0);
  expect(sources).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(artworkCanvas(page)).toBeVisible();
  await expect(poster).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(poster).toBeVisible();
  await expect(artworkCanvas(page)).toHaveCount(0);
});

test('home artwork survives a source image failure', async ({ page }) => {
  await page.route(SOURCE_IMAGE, (route) => route.abort());
  await page.goto('/');
  await expect(page.getByAltText(POSTER_ALT)).toBeVisible();
  await expect(artworkCanvas(page)).toHaveCount(0);
  await expect(page.locator('#install')).toContainText('npm install -g @agentinbox/cli');
});

test('home animation suspends offscreen and resumes on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(artworkCanvas(page)).toBeVisible();
  await page.locator('footer').scrollIntoViewIfNeeded();
  // Offscreen the effect stops painting, so the canvas holds one frame.
  await page.waitForTimeout(300);
  const held = await canvasFrame(page);
  await page.waitForTimeout(500);
  expect(await canvasFrame(page)).toBe(held);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => canvasFrame(page)).not.toBe(held);
});

test('home documentation and artwork work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByAltText(POSTER_ALT)).toBeVisible();
  await expect(page.locator('#invite')).toContainText('carol@acme.com');
  await page.getByRole('link', { name: 'agentinbox.md/sapien' }).click();
  await expect(page).toHaveURL(/\/sapien$/);
  await context.close();
});
