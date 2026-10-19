import { z } from 'zod';
import { emailControlSchema, payloadSchema } from './schemas';

export type PayloadSchema = z.infer<typeof payloadSchema>;
export type ControlSchema = z.infer<typeof emailControlSchema>;
