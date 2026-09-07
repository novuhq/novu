import { UserSessionData } from '@novu/shared';

let nr: any;

try {
  nr = require('newrelic');
} catch {
  nr = null;
}

export function addNewRelicTraceAttributes(session: UserSessionData) {
  if (!nr || typeof nr.addCustomAttributes !== 'function') return;

  try {
    nr.addCustomAttributes({
      organizationId: session.organizationId,
      environmentId: session.environmentId,
    });
  } catch {
    // swallow – NR failures must never break authentication
  }
}
