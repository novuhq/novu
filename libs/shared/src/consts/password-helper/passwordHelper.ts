export const passwordConstraints = {
  minLength: 8,
  maxLength: 64,
  pattern: /^(?=(.*[a-z]){1,})(?=(.*[A-Z]){1,})(?=(.*[0-9]){1,})(?=(.*[!@#$%^&*()\-__+.]){1,}).{8,64}$/,
};
