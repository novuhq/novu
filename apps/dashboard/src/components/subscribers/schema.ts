import { isValidPhoneNumber } from 'react-phone-number-input';
import { z } from 'zod';

export const SubscriberFormSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.email().optional().nullable(),
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
    .refine(
      (str) => {
        if (!str) return true;
        try {
          JSON.parse(str);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Custom data must be a valid JSON' }
    )
    .optional(),
});

export const CreateSubscriberFormSchema = SubscriberFormSchema.extend({
  subscriberId: z.string().min(1, 'SubscriberId is required').trim(),
  email: z
    .string()
    .trim()
    .refine((val) => val === '' || z.email().safeParse(val).success, {
      message: 'Invalid email',
    }),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});
