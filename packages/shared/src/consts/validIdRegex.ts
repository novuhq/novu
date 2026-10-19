export const ALPHANUMERIC_REGEX = /^[a-zA-Z0-9_:.-]+$/;
export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
export const VALID_ID_REGEX = new RegExp(`${ALPHANUMERIC_REGEX.source}|${EMAIL_REGEX.source}`);
