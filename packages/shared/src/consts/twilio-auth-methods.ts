/** Credentials that authenticate Twilio requests. A missing value means `authToken`. */
export const TWILIO_AUTH_METHODS = ['authToken', 'apiKey'] as const;

export type TwilioAuthMethod = (typeof TWILIO_AUTH_METHODS)[number];
