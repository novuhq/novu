import { expect, type Page, test } from '@playwright/test';

const copied = 'Command copied to clipboard';
const closingField = (page: Page) => page.getByRole('group', { name: 'Closing setup command' });
const copyButton = (page: Page, group = closingField(page)) =>
  group.getByRole('button', { name: 'Copy command', exact: true });

test('copies only the setup command and resets feedback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copiedText = text;
        },
      },
    });
  });
  await page.goto('/sapien');
  const control = closingField(page);
  await copyButton(page).click();
  await expect(page.locator('html')).toHaveAttribute('data-copied-text', 'npx @agentinbox/cli setup');
  await expect(control.getByRole('status')).toHaveText(copied);
  await expect(control.getByRole('status')).toHaveText('', { timeout: 4000 });
});
test('does not announce success before the clipboard write resolves', async ({ page }) => {
  await page.addInitScript(() => {
    let release: (() => void) | undefined;
    let calls = 0;
    window.addEventListener('resolve-copy', () => release?.());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => {
          document.documentElement.dataset.copyCalls = String(++calls);
          return new Promise<void>((resolve) => {
            release = resolve;
          });
        },
      },
    });
  });
  await page.goto('/sapien');
  const control = closingField(page);
  const button = copyButton(page);
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-copy-calls', '1');
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await expect(control.getByRole('status')).toHaveText('');
  await page.evaluate(() => window.dispatchEvent(new Event('resolve-copy')));
  await expect(control.getByRole('status')).toHaveText(copied);
  await expect(button).toBeFocused();
});
for (const unavailable of [false, true]) {
  test(`clipboard ${unavailable ? 'absent' : 'denied'} supports retry`, async ({ page }) => {
    await page.addInitScript((absent) => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: absent
          ? undefined
          : {
              writeText: async () => {
                throw new Error('denied');
              },
            },
      });
    }, unavailable);
    await page.goto('/sapien');
    const control = closingField(page);
    await copyButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(control.getByRole('status')).toHaveText("Couldn't copy. Select the command and copy it manually.");
    await expect(copyButton(page)).toBeFocused();
    await expect(control.locator('code')).toHaveText('npx @agentinbox/cli setup');
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => undefined },
      })
    );
    await copyButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(control.getByRole('status')).toHaveText(copied);
  });
}

test('a repeated copy gets its own feedback interval', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => undefined },
    })
  );
  await page.clock.install();
  await page.goto('/sapien');
  const status = closingField(page).getByRole('status');
  await copyButton(page).click();
  await expect(status).toHaveText(copied);
  await page.clock.fastForward(1000);
  await copyButton(page).click();
  await page.clock.fastForward(1100);
  await expect(status).toHaveText(copied);
  await page.clock.fastForward(1000);
  await expect(status).toHaveText('');
});

test('hero and closing copy feedback remain independent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copiedText = text;
        },
      },
    });
  });
  await page.goto('/sapien');
  const hero = page.getByRole('group', { name: 'Hero setup command' });
  const closing = closingField(page);
  await copyButton(page).click();
  await expect(closing.getByRole('status')).toHaveText(copied);
  await expect(hero.getByRole('status')).toHaveText('');
  await expect(page.locator('html')).toHaveAttribute('data-copied-text', 'npx @agentinbox/cli setup');
  await copyButton(page, hero).click();
  await expect(hero.getByRole('status')).toHaveText(copied);
  await expect(closing.getByRole('status')).toHaveText(copied);
});

test('hero prompt copy uses the shared setup prompt', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copiedText = text;
        },
      },
    });
  });
  await page.goto('/sapien');
  const hero = page.locator('#hero');
  await hero.getByRole('button', { name: 'Copy Prompt' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-copied-text', /npx @agentinbox\/cli setup/);
  await expect(hero.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
});
