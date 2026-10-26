import { expect, test } from '@playwright/test';

const GTM_ID = 'GTM-TQVVFJ4J';

test.use({ javaScriptEnabled: false });

for (const path of ['/', '/sapien']) {
  test(`Google Tag Manager is in the first HTML on ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    const html = await response?.text();
    expect(html).toBeTruthy();

    const headEnd = html!.indexOf('</head>');
    const bodyStart = html!.indexOf('<body');
    expect(headEnd).toBeGreaterThan(-1);
    expect(bodyStart).toBeGreaterThan(headEnd);

    const head = html!.slice(0, headEnd);
    expect(head).toContain('https://www.googletagmanager.com/gtm.js?id=');
    expect(head).toContain(`'${GTM_ID}'`);

    const bodyOpenEnd = html!.indexOf('>', bodyStart);
    const afterBody = html!.slice(bodyOpenEnd + 1).trimStart();
    expect(afterBody.startsWith('<noscript>')).toBe(true);
    expect(afterBody).toContain(`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`);
  });
}
