import { ClickatellSmsProvider } from './src/index';

const provider = new ClickatellSmsProvider({
  apiKey: 'otbjTKxDRlGxGlA6wiSCKQ==',
});

provider.sendMessage({
  content: 'Help messss',
  to: '+2349011896860',
});
