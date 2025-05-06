import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';

export const SubscriberFormSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().nullable(),
  phone: z
    .string()
    .refine(isValidPhoneNumber, { message: 'Invalid phone number' })
    .optional()
    .or(z.literal(''))
    .optional(),
  avatar: z.string().optional(),
  locale: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  data: z
    .string()
    .transform((str, ctx) => {
      try {
        if (!str) return '';
        return JSON.parse(str);
      } catch (e) {
        ctx.addIssue({ code: 'custom', message: 'Custom data must be a valid JSON' });
        return z.NEVER;
      }
    })
    .optional(),
});

export const CreateSubscriberFormSchema = SubscriberFormSchema.extend({
  subscriberId: z.string().transform((str, ctc) => {
    if (!str.trim()) {
      ctc.addIssue({ code: 'custom', message: 'SubscriberId is required' });
      return z.NEVER;
    }

    return str;
  }),
  email: z
    .string()
    .trim()
    .refine((val) => val === '' || z.string().email().safeParse(val).success, {
      message: 'Invalid email',
    }),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});
