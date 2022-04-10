import { ThemeStore } from './theme.store';

test('should get a theme by id', async () => {
  const store = new ThemeStore();

  await store.addTheme('test1', {
    branding: {
      logo: 'https://example.com/logo.png',
    },
    emailTemplate: {
      getEmailLayout(): string {
        return '';
      },
      getTemplateVariables(): Record<string, unknown> {
        return {};
      },
    },
  });

  const theme = await store.getThemeById('test1');

  expect(theme).toBeTruthy();
  expect(theme?.branding.logo).toEqual('https://example.com/logo.png');
});
