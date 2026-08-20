import { describe, expectTypeOf, it } from 'vitest';
import type { Workflow } from '../../types/discover.types';
import type { AgentNotification } from './agent.types';
import { isFromWorkflow } from './guards';

describe('isFromWorkflow', () => {
  it('narrows notification.payload to the workflow schema type', () => {
    type OrderPayload = { trackingNumber: string; orderId: string };
    const orderShipped = { id: 'order-shipped' } as Workflow<OrderPayload>;
    const notification = {
      id: 'n1',
      workflowId: 'order-shipped',
      messageId: 'm1',
      platformMessageId: 'p1',
      sentAt: '2026-01-01T00:00:00.000Z',
      payload: { trackingNumber: '1Z', orderId: 'ORD-1' },
    } satisfies AgentNotification;

    if (isFromWorkflow(notification, orderShipped)) {
      expectTypeOf(notification.payload).toEqualTypeOf<OrderPayload>();
      expectTypeOf(notification.payload.trackingNumber).toEqualTypeOf<string>();
    }
  });

  it('keeps a broad payload type when the workflow id does not match', () => {
    type OrderPayload = { trackingNumber: string };
    const orderShipped = { id: 'order-shipped' } as Workflow<OrderPayload>;
    const notification: AgentNotification = {
      id: 'n1',
      workflowId: 'other-workflow',
      messageId: 'm1',
      platformMessageId: 'p1',
      sentAt: '2026-01-01T00:00:00.000Z',
      payload: { trackingNumber: '1Z' },
    };

    if (!isFromWorkflow(notification, orderShipped)) {
      expectTypeOf(notification.payload).toEqualTypeOf<Record<string, unknown>>();
    }
  });

  it('excludes a null notification from the narrowed branch', () => {
    type OrderPayload = { trackingNumber: string };
    const orderShipped = { id: 'order-shipped' } as Workflow<OrderPayload>;
    const notification = {} as AgentNotification | null;

    if (isFromWorkflow(notification, orderShipped)) {
      expectTypeOf(notification.payload).toEqualTypeOf<OrderPayload>();
    }
  });
});
