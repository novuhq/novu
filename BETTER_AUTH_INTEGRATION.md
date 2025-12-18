# Better Auth Integration - Implementation Summary

This document summarizes the changes made to support Better Auth as an alternative enterprise authentication provider alongside Clerk.

## Overview

The Novu codebase now supports three authentication modes:
1. **Community Edition**: Internal JWT auth with GitHub OAuth
2. **Enterprise Edition with Clerk**: Existing Clerk integration
3. **Enterprise Edition with Better Auth**: New Better Auth integration

## Architecture Changes

### Backend Changes

#### 1. Environment Variable Management (`packages/shared/src/utils/env.ts`)

Added new functions for EE auth provider detection:

```typescript
export type EEAuthProvider = 'clerk' | 'better-auth';

export const isEEAuthEnabled = () =>
  process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';

export const getEEAuthProvider = (): EEAuthProvider => {
  const provider = process.env.EE_AUTH_PROVIDER as EEAuthProvider | undefined;
  return provider || 'clerk';
};

export const isClerkEnabled = () => isEEAuthEnabled() && getEEAuthProvider() === 'clerk';
export const isBetterAuthEnabled = () => isEEAuthEnabled() && getEEAuthProvider() === 'better-auth';
```

#### 2. PassportStrategy Enum (`packages/shared/src/types/auth.ts`)

Added new strategy for Better Auth:

```typescript
export enum PassportStrategyEnum {
  JWT = 'jwt',
  JWT_CLERK = 'jwt-clerk',
  JWT_BETTER_AUTH = 'jwt-better-auth',  // NEW
  HEADER_API_KEY = 'headerapikey',
  KEYLESS = 'keyless',
}
```

#### 3. Auth Provider Abstraction (`enterprise/packages/auth/src/providers/`)

Created a provider factory pattern with the following structure:

```
enterprise/packages/auth/src/providers/
├── ee-auth-provider.interface.ts    # Common interface
├── index.ts                          # Provider factory
├── clerk/
│   ├── clerk.provider.ts            # Clerk implementation
│   └── index.ts
└── better-auth/
    ├── better-auth.provider.ts      # Better Auth implementation
    └── index.ts
```

**Key Interface:**

```typescript
export interface IEEAuthProvider {
  getModuleConfig(): EEAuthProviderConfig;
  validateJwtPayload(payload: any): EEJwtPayload;
  transformToUserSession(payload: EEJwtPayload, environmentId: string): UserSessionData;
}
```

#### 4. Better Auth Passport Strategy (`enterprise/packages/auth/src/strategies/better-auth.strategy.ts`)

Implements JWT validation for Better Auth tokens using the standard passport-jwt strategy with HS256 algorithm.

#### 5. EE Auth Module (`enterprise/packages/auth/src/ee.auth.module.ts`)

Refactored to use the provider factory pattern:

```typescript
const authProvider = getAuthProviderInstance();
const providerConfig = authProvider.getModuleConfig();

const SERVICES = [
  ...BASE_SERVICES,
  providerConfig.strategy,
  ...providerConfig.webhookHandlers,
  ...providerConfig.usecases,
];
```

#### 6. EE User Auth Guard (`enterprise/packages/auth/src/guards/ee.user.auth.guard.ts`)

Updated to dynamically select the JWT strategy based on the configured provider:

```typescript
function getEEJwtStrategy(): PassportStrategyEnum {
  const provider = getEEAuthProvider();
  return provider === 'clerk' ? PassportStrategyEnum.JWT_CLERK : PassportStrategyEnum.JWT_BETTER_AUTH;
}
```

### Frontend Changes (Dashboard)

#### 1. Vite Configuration (`apps/dashboard/vite.config.ts`)

Added support for provider-based aliasing:

```typescript
const eeAuthProvider = env.VITE_EE_AUTH_PROVIDER || 'clerk';

// In resolve.alias:
...(isSelfHosted
  ? {
      '@clerk/clerk-react': path.resolve(__dirname, './src/utils/self-hosted/index.tsx'),
      // ... other self-hosted aliases
    }
  : eeAuthProvider === 'better-auth'
    ? {
        '@clerk/clerk-react': path.resolve(__dirname, './src/utils/better-auth/index.tsx'),
      }
    : {})
```

#### 2. Better Auth Wrapper (`apps/dashboard/src/utils/better-auth/index.tsx`)

Created a wrapper that mimics the Clerk React API, including:
- `ClerkProvider` - Main provider component
- `useAuth()` - Auth state hook
- `useUser()` - User data hook
- `useOrganization()` - Organization data hook
- `useOrganizationList()` - Organization list hook
- `useClerk()` - Clerk instance hook
- `SignedIn`, `SignedOut` - Conditional rendering components
- `RedirectToSignIn` - Redirect component
- Placeholder components for `SignIn`, `SignUp`, `UserButton`, `OrganizationSwitcher`

#### 3. EE Auth Provider (`apps/dashboard/src/context/ee-auth-provider.tsx`)

Created a new provider wrapper that conditionally renders the appropriate auth provider:

```typescript
export const EEAuthProvider = (props: EEAuthProviderProps) => {
  if (IS_SELF_HOSTED) {
    return <>{children}</>;
  }

  if (EE_AUTH_PROVIDER === 'better-auth') {
    return <>{children}</>;
  }

  // Render Clerk provider with configuration
  return <_ClerkProvider ...>{children}</_ClerkProvider>;
};
```

#### 4. Configuration (`apps/dashboard/src/config/index.ts`)

Added new environment variables and validation:

```typescript
export const EE_AUTH_PROVIDER = (window._env_?.VITE_EE_AUTH_PROVIDER ||
  import.meta.env.VITE_EE_AUTH_PROVIDER ||
  'clerk') as 'clerk' | 'better-auth';

export const BETTER_AUTH_BASE_URL =
  window._env_?.VITE_BETTER_AUTH_BASE_URL || 
  import.meta.env.VITE_BETTER_AUTH_BASE_URL || 
  API_HOSTNAME;

// Validation
if (!IS_SELF_HOSTED && EE_AUTH_PROVIDER === 'clerk' && !CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

if (!IS_SELF_HOSTED && EE_AUTH_PROVIDER === 'better-auth' && !BETTER_AUTH_BASE_URL) {
  throw new Error('Missing Better Auth Base URL');
}
```

#### 5. Root Route (`apps/dashboard/src/routes/root.tsx`)

Updated to use the new EEAuthProvider:

```typescript
import { EEAuthProvider as ClerkProvider } from '@/context/ee-auth-provider';
```

## Environment Variables

### Backend

| Variable | Values | Description | Required |
|----------|--------|-------------|----------|
| `NOVU_ENTERPRISE` | `true`, `false` | Enable enterprise features | Yes for EE |
| `EE_AUTH_PROVIDER` | `clerk`, `better-auth` | Select auth provider | No (defaults to `clerk`) |
| `CLERK_ENABLED` | `true`, `false` | Legacy Clerk flag | No (deprecated) |
| `CLERK_ISSUER_URL` | URL | Clerk issuer URL | Yes if using Clerk |
| `BETTER_AUTH_SECRET` | String | Better Auth JWT secret | Yes if using Better Auth |

### Frontend (Dashboard)

| Variable | Values | Description | Required |
|----------|--------|-------------|----------|
| `VITE_IS_EE_AUTH_ENABLED` | `true`, `false` | Enable EE auth | Yes for EE |
| `VITE_EE_AUTH_PROVIDER` | `clerk`, `better-auth` | Select auth provider | No (defaults to `clerk`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | String | Clerk publishable key | Yes if using Clerk |
| `VITE_BETTER_AUTH_BASE_URL` | URL | Better Auth API base URL | No (defaults to API_HOSTNAME) |

## Usage

### Using Clerk (Default)

**Backend:**
```bash
NOVU_ENTERPRISE=true
EE_AUTH_PROVIDER=clerk
CLERK_ENABLED=true
CLERK_ISSUER_URL=https://your-clerk-instance.clerk.accounts.dev
```

**Frontend:**
```bash
VITE_IS_EE_AUTH_ENABLED=true
VITE_EE_AUTH_PROVIDER=clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Using Better Auth

**Backend:**
```bash
NOVU_ENTERPRISE=true
EE_AUTH_PROVIDER=better-auth
BETTER_AUTH_SECRET=your-jwt-secret
JWT_SECRET=your-jwt-secret
```

**Frontend:**
```bash
VITE_IS_EE_AUTH_ENABLED=true
VITE_EE_AUTH_PROVIDER=better-auth
VITE_BETTER_AUTH_BASE_URL=https://your-api.com
```

## Migration Path

To migrate from Clerk to Better Auth:

1. Update backend environment variables to use `EE_AUTH_PROVIDER=better-auth`
2. Configure `BETTER_AUTH_SECRET` with your JWT secret
3. Update frontend environment variables to use `VITE_EE_AUTH_PROVIDER=better-auth`
4. Implement the Better Auth sign-in/sign-up UI components (currently placeholders)
5. Test authentication flow end-to-end

## Next Steps

The following components need to be implemented for a complete Better Auth integration:

1. **Better Auth Sign In Component** - Replace placeholder in `apps/dashboard/src/utils/better-auth/index.tsx`
2. **Better Auth Sign Up Component** - Replace placeholder
3. **Better Auth User Button** - Replace placeholder
4. **Better Auth Organization Switcher** - Replace placeholder
5. **Better Auth Session Management** - Implement proper session refresh and token management
6. **Better Auth Webhooks** - Implement webhook handlers for user/org events (similar to Clerk)
7. **Tests** - Add E2E tests for Better Auth flow

## Files Modified

### Backend
- `packages/shared/src/utils/env.ts`
- `packages/shared/src/types/auth.ts`
- `enterprise/packages/auth/src/ee.auth.module.ts`
- `enterprise/packages/auth/src/guards/ee.user.auth.guard.ts`

### Backend (New Files)
- `enterprise/packages/auth/src/providers/ee-auth-provider.interface.ts`
- `enterprise/packages/auth/src/providers/index.ts`
- `enterprise/packages/auth/src/providers/clerk/clerk.provider.ts`
- `enterprise/packages/auth/src/providers/clerk/index.ts`
- `enterprise/packages/auth/src/providers/better-auth/better-auth.provider.ts`
- `enterprise/packages/auth/src/providers/better-auth/index.ts`
- `enterprise/packages/auth/src/strategies/better-auth.strategy.ts`

### Frontend
- `apps/dashboard/vite.config.ts`
- `apps/dashboard/src/config/index.ts`
- `apps/dashboard/src/routes/root.tsx`

### Frontend (New Files)
- `apps/dashboard/src/utils/better-auth/index.tsx`
- `apps/dashboard/src/context/ee-auth-provider.tsx`

## Backwards Compatibility

The implementation maintains full backwards compatibility:

- Existing Clerk deployments continue to work without any changes
- The `isClerkEnabled()` function is preserved for backwards compatibility
- Default behavior (when `EE_AUTH_PROVIDER` is not set) is to use Clerk
- Community edition authentication is unaffected

## Testing

To test the implementation:

1. **Clerk Mode (Default):**
   ```bash
   # Backend
   NOVU_ENTERPRISE=true CLERK_ENABLED=true
   
   # Frontend
   VITE_IS_EE_AUTH_ENABLED=true
   ```

2. **Better Auth Mode:**
   ```bash
   # Backend
   NOVU_ENTERPRISE=true EE_AUTH_PROVIDER=better-auth
   
   # Frontend
   VITE_IS_EE_AUTH_ENABLED=true VITE_EE_AUTH_PROVIDER=better-auth
   ```

3. **Community Mode:**
   ```bash
   # Backend
   NOVU_ENTERPRISE=false
   
   # Frontend
   VITE_IS_EE_AUTH_ENABLED=false
   ```
