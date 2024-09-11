export const passwordConstraints = {
  minLength: 8,
  maxLength: 64,
  pattern: /^(?=[^A-Z\n]*[A-Z])(?=[^a-z\n]*[a-z])(?=[^0-9\n]*[0-9])(?=[^#?!@$%^&*\-()\n]*[#?!@$%^&*()-]).\S{8,64}$/,
};
