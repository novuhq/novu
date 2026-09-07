export function generateKey() {
  // Length of 6 is enough to avoid collisions
  // for react keys
  return Math.random().toString(36).substr(2, 6);
}
