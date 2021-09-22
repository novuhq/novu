import { ThemeStore } from './theme.store';

test('should get a theme by id', async () => {
  const store = new ThemeStore();

  await store.addTheme({
    id: 'test1',
    branding: {
      logo: 'https://example.com/logo.png',
    },
    email: {
      layout: `Test Layout`,
    },
  });

  const theme = await store.getThemeById('test1');
  expect(theme).toBeTruthy();
  expect(theme.id).toEqual('test1');
});
