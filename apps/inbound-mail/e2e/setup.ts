import sinon from 'sinon';

import '../src/main';
import mailinServer from '../src/server/index';

after(async () => {
  await new Promise<void>((resolve) => mailinServer.stop(resolve));
});

afterEach(() => {
  sinon.restore();
});
