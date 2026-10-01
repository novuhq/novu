import { Novu } from '../dist/esm/index.mjs';

const novu = new Novu({ applicationIdentifier: 'app', subscriberId: 'sub' });
void novu.notifications.list({ limit: 10 });
