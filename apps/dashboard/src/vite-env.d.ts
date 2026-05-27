/// <reference types="vite/client" />

export {};

declare global {
  interface CustomJwtSessionClaims {
    requireMfa?: boolean;
    isMfaEnabled?: boolean;
  }
}
