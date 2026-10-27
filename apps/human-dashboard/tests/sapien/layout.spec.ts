import { expect, test } from '@playwright/test';

for (const width of [320, 1024, 1440]) {
  test(`expanded text remains readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/sapien');
    await page.addStyleTag({
      content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }',
    });
    const issues = await page
      .locator('#hero, #inbox, #building-blocks, #use-cases, #integrations, #scale, #security, #faq, #get-started')
      .evaluateAll((sections) => {
        const issues: string[] = [];
        for (const section of sections) {
          const texts = [...section.querySelectorAll('h1,h2,p,code')].filter(
            (node) =>
              !node.closest('[aria-hidden="true"]') &&
              !node.classList.contains('sr-only') &&
              // Inactive tab panels and closed answers are not rendered.
              node.checkVisibility({ visibilityProperty: true })
          );
          for (const node of texts) {
            const range = document.createRange();
            range.selectNodeContents(node);
            const text = range.getBoundingClientRect();
            for (let parent = node.parentElement; parent; parent = parent.parentElement) {
              const style = getComputedStyle(parent),
                bounds = parent.getBoundingClientRect();
              if (/hidden|clip/.test(style.overflowY) && (text.top < bounds.top - 1 || text.bottom > bounds.bottom + 1))
                issues.push(`clipped: ${node.textContent}`);
            }
            // Terminal transcripts scroll horizontally inside their window.
            const scrolls = (element: Element | null): boolean =>
              !!element && (/auto|scroll/.test(getComputedStyle(element).overflowX) || scrolls(element.parentElement));
            if ((text.left < 0 || text.right > document.documentElement.clientWidth) && !scrolls(node))
              issues.push(`offscreen: ${node.textContent}`);
          }
          for (let i = 0; i < texts.length; i++)
            for (let j = i + 1; j < texts.length; j++) {
              const a = texts[i].getBoundingClientRect(),
                b = texts[j].getBoundingClientRect();
              if (
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
              )
                issues.push(`overlap: ${texts[i].textContent} / ${texts[j].textContent}`);
            }
        }
        return issues;
      });
    expect(issues).toEqual([]);
  });
}

for (const area of ['header', 'footer']) {
  test(`${area} agentinbox logo opens the index page`, async ({ page }) => {
    await page.goto('/sapien');
    await page.locator(area).getByRole('link', { name: 'agentinbox' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('agentinbox.mdThe inbox API for agents');
  });
}
