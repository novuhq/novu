import { VALID_ID_REGEX } from '@novu/shared';
import { z } from 'zod';

export const subscriberIdSchema = z.string().trim().regex(VALID_ID_REGEX);
export const subscriberObjectSchema = z.object({ subscriberId: subscriberIdSchema }).passthrough();
export const topicSchema = z.object({ topicKey: subscriberIdSchema }).passthrough();
export const RecipientSchema = z.union([subscriberIdSchema, subscriberObjectSchema, topicSchema]);
export const RecipientsSchema = z.union([RecipientSchema, z.array(RecipientSchema)]);
