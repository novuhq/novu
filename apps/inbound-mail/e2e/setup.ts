import { testServer } from '@novu/testing';
import sinon from 'sinon';

import mailin from '../src/main';

before(async () => {
  await testServer.create(mailin);
});

after(async () => {
  await testServer.teardown();
});

afterEach(() => {
  sinon.restore();
});
