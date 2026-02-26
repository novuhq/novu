import { UserSessionData } from '@novu/shared';

let nr: any;

try {
  nr = require('newrelic');
} catch {
  nr = null;
}

export function addNewRelicTraceAttributes(session: UserSessionData) {
  if (!nr) return;

  nr.addCustomAttributes({
    organizationId: session.organizationId,
    environmentId: session.environmentId,
  });
}
