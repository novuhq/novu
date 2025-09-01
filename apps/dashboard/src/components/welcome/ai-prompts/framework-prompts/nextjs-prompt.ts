export const NEXTJS_PROMPT = `# Novu Notification Inbox Integration Guide

You are a senior full-stack developer specializing in seamless third-party integrations. Your task is to integrate Novu's notification inbox component into an existing Next.js application with pixel-perfect visual integration that makes it appear native to the application.

## Success Criteria
The integration is successful when users cannot distinguish the Novu component from the application's native components. All styling, interactions, and behaviors must match the existing design system exactly.

## Technical Constraints
- Use only official Novu API from \`@novu/nextjs\` package
- Reference documentation: https://docs.novu.co/platform/quickstart/nextjs
- Provide only working code implementations (no markdown documentation or reports)
- Integration must be production-ready with proper error handling

## Step-by-Step Implementation Process

### Phase 1: Technical Setup (5 minutes maximum)

**1.1 Package Installation**
Analyze the project structure and install the appropriate package:

\`\`\`bash
# Determine package manager first
# If package-lock.json exists: use npm
# If yarn.lock exists: use yarn  
# If pnpm-lock.yaml exists: use pnpm

npm install @novu/nextjs
# OR yarn add @novu/nextjs
# OR pnpm add @novu/nextjs
\`\`\`

**1.2 Environment Configuration**
Create and configure environment variables:

\`\`\`bash
# Create .env.local in project root (same level as package.json)
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=your-actual-app-id-here

# For EU region (optional):
NEXT_PUBLIC_NOVU_API_URL=https://eu.api.novu.co
NEXT_PUBLIC_NOVU_SOCKET_URL=wss://eu.socket.novu.co
\`\`\`

**1.3 Basic Implementation Test**
Create this test component to verify setup:

\`\`\`tsx
import { Inbox } from '@novu/nextjs';

export function TestNotifications() {
  console.log('Novu App ID:', process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER);
  
  return (
    <Inbox
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
      subscriber="test-user-123"
    />
  );
}
\`\`\`

**Validation Checklist - Must Pass Before Proceeding:**
- [ ] Package installs without errors
- [ ] Environment variable logs correctly (not undefined)
- [ ] Test component renders without console errors
- [ ] \`.gitignore\` contains \`.env*\` to protect environment files

### Phase 2: Design System Analysis (5 minutes maximum)

**2.1 Critical Visual Elements Analysis**
Use browser dev tools to extract exact styling values:

\`\`\`tsx
// Document your findings in this format:
const designTokens = {
  // REQUIRED - Get these exact values using browser inspect
  textPrimary: '#1a1a1a',      // Right-click heading text → Inspect → Copy color value
  textSecondary: '#6b7280',    // Right-click body text → Inspect → Copy color value  
  textMuted: '#9ca3af',        // Right-click subtle text → Inspect → Copy color value
  backgroundPrimary: '#ffffff', // Right-click modal/card background → Inspect
  borderRadius: '8px',         // Right-click button → Inspect → Copy border-radius value
  
  // CONDITIONAL - Capture if app uses custom patterns
  fontFamily: 'Inter, sans-serif', // From computed styles
  primaryColor: '#3b82f6',     // From button/link inspection
  spacingUnit: '16px',         // Pattern from padding/margin values
}
\`\`\`

**2.2 Authentication System Detection**
Identify how the application handles user identity:

\`\`\`bash
# Run these commands to detect auth system:
grep -E "(clerk|auth0|supabase|firebase|next-auth)" package.json
grep -r "useUser\\|useAuth\\|useSession" src/ --include="*.tsx"
\`\`\`

**2.3 Integration Level Selection**
Choose ONE approach based on these specific criteria:

**Level 1 - Appearance Props** (Use if ALL are true):
- [ ] Application uses standard UI patterns (conventional buttons, dropdowns, modals)
- [ ] Consistent color scheme throughout application
- [ ] Typography is uniform (same font family, predictable sizing)
- [ ] Standard navigation layout can accommodate bell + dropdown
- [ ] Components use similar border radius, spacing, shadows

**Level 2 - Composable Components** (Use if ANY are true):
- [ ] Unique navigation layout (sidebar, custom header)
- [ ] Need to embed in existing popover/modal system
- [ ] Custom container patterns that require integration
- [ ] Want to separate bell trigger from content placement

**Level 3 - Custom Render Props** (Use if ANY are true):
- [ ] Notification items need different layouts than standard cards
- [ ] Sophisticated design system with custom components
- [ ] Dynamic rendering based on notification metadata
- [ ] Standard appearance doesn't match content patterns

**Level 4 - Headless Hooks** (Use if ANY are true):
- [ ] Building multiple notification interfaces
- [ ] Need complete control over data flow and state
- [ ] Complex notification business logic requirements
- [ ] Integration with existing state management systems

### Phase 3: Implementation

#### LEVEL 1: Appearance Props Implementation

\`\`\`tsx
import { Inbox } from '@novu/nextjs';

const appearance = {
  variables: {
    // Apply exact values from your design analysis
    colorForeground: '#1a1a1a',           // Primary text from inspection
    colorSecondaryForeground: '#6b7280',  // Secondary text from inspection
    colorBackground: '#ffffff',           // Modal background from inspection
    colorPrimary: '#3b82f6',             // Brand color from button inspection
    borderRadius: '8px',                 // Border radius from button inspection
    fontSize: '14px'                     // Body text size from inspection
  },
  elements: {
    // Professional container styling
    inboxContainer: {
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      width: '400px',
      maxHeight: '550px'
    },
    
    // Individual notification styling
    notification: {
      borderRadius: '6px',
      padding: '12px 16px',
      borderBottom: '1px solid #f3f4f6'
    },
    
    // Text hierarchy matching
    notificationSubject: { 
      color: 'INSERT_EXACT_HEADING_COLOR_HERE',
      fontWeight: '600',
      fontSize: '14px',
      marginBottom: '4px'
    },
    notificationBody: { 
      color: 'INSERT_EXACT_BODY_COLOR_HERE',
      fontSize: '13px',
      lineHeight: '1.4'
    }
  }
};

export function NotificationInbox() {
  // Replace with your actual auth integration
  const { user } = useAuth(); // Adjust based on detected auth system
  
  return (
    <Inbox
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
      subscriber={user?.id || 'anonymous'}
      appearance={appearance}
    />
  );
}
\`\`\`

#### Authentication Integration Patterns

Based on your detected auth system, implement ONE of these patterns:

**For Clerk (if ClerkProvider found):**
\`\`\`tsx
import { useUser } from "@clerk/nextjs";

const { user } = useUser();
const subscriberId = user?.id || 'anonymous';
\`\`\`

**For NextAuth (if SessionProvider found):**
\`\`\`tsx
import { useSession } from "next-auth/react";

const { data: session } = useSession();
const subscriberId = session?.user?.id || session?.user?.email || 'anonymous';
\`\`\`

**For Custom Auth Hook (if useAuth found):**
\`\`\`tsx
import { useAuth } from "./path/to/auth";

const { user } = useAuth();
const subscriberId = user?.id || user?.email || 'anonymous';
\`\`\`

#### LEVEL 2: Composable Components Implementation

\`\`\`tsx
import { Inbox, Notifications, Bell } from '@novu/nextjs';

// Integrate with existing popover system
export function CustomNotificationSystem() {
  const { user } = useAuth();
  
  return (
    <YourExistingPopover>
      <YourPopoverTrigger>
        <Inbox 
          applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
          subscriber={user?.id || 'anonymous'}
        >
          <Bell />
        </Inbox>
      </YourPopoverTrigger>
      <YourPopoverContent>
        <Inbox 
          applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
          subscriber={user?.id || 'anonymous'}
        >
          <Notifications />
        </Inbox>
      </YourPopoverContent>
    </YourExistingPopover>
  );
}
\`\`\`

#### LEVEL 3: Custom Render Props Implementation

\`\`\`tsx
export function CustomInbox() {
  const { user } = useAuth();
  
  return (
    <Inbox
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
      subscriber={user?.id || 'anonymous'}
      renderBell={(unreadCount) => (
        <YourCustomBellComponent 
          count={unreadCount.total}
          className="your-existing-icon-classes"
        />
      )}
      renderNotification={(notification) => (
        <YourCustomNotificationCard
          title={notification.subject}
          content={notification.body}
          timestamp={notification.createdAt}
          isRead={notification.isRead}
          className="your-existing-card-classes"
        />
      )}
    />
  );
}
\`\`\`

#### LEVEL 4: Headless Hooks Implementation

\`\`\`tsx
// 1. Wrap your app with NovuProvider
import { NovuProvider } from '@novu/nextjs';

function App() {
  return (
    <NovuProvider
      subscriberId="USER_ID"
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
    >
      <YourApplication />
    </NovuProvider>
  );
}

// 2. Create custom notification interface
import { useNotifications, useCounts } from '@novu/nextjs';

function CustomNotificationInterface() {
  const { notifications, fetchMore, hasMore } = useNotifications();
  const { counts } = useCounts({ filters: [{ read: false }] });
  
  const unreadCount = counts?.[0]?.count ?? 0;
  
  return (
    <YourCustomContainer>
      <YourCustomBell count={unreadCount} />
      <YourCustomNotificationList 
        notifications={notifications}
        onLoadMore={hasMore ? fetchMore : undefined}
      />
    </YourCustomContainer>
  );
}
\`\`\`

### Phase 4: Quality Validation

**Critical Validation (Must Pass - Shipping Blockers):**
- [ ] Zero console errors related to Novu components
- [ ] Component renders in expected navigation location
- [ ] Basic interaction works (bell click opens panel)
- [ ] Authentication provides valid subscriber ID (not null/undefined)
- [ ] Environment variable loads correctly

**Visual Integration Validation (Must Match Exactly):**
- [ ] **Text Color Accuracy**: Compare notification text color in dev tools with existing app text - values must be identical
- [ ] **Typography Consistency**: Font family, size, weight matches existing components exactly
- [ ] **Background Color Matching**: Notification backgrounds identical to app's modal/card backgrounds
- [ ] **Border Radius Consistency**: Container and notification item radius within 2px of app's button/modal radius
- [ ] **Professional Proportions**: Container width 350-450px, reasonable height with scroll, adequate padding
- [ ] **Mobile Responsiveness**: Functions without horizontal scroll at 320px width

### Phase 5: Troubleshooting Guide

**Component Not Rendering Issues:**

1. **Environment Variable Problems:**
   \`\`\`tsx
   // Debug environment setup
   console.log('Novu App ID:', process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER);
   // Should output your app ID, not undefined
   
   // If undefined: Check .env.local location, restart dev server, verify NEXT_PUBLIC_ prefix
   \`\`\`

2. **Import/Package Issues:**
   \`\`\`tsx
   // Test import
   import { Inbox } from '@novu/nextjs';
   console.log('Inbox component:', Inbox);
   // Should log function, not undefined
   \`\`\`

3. **Authentication Issues:**
   \`\`\`tsx
   // Debug subscriber ID
   const subscriberId = user?.id || 'test-user';
   console.log('Subscriber ID:', subscriberId, 'Type:', typeof subscriberId);
   // Should be string, not null/undefined/object
   \`\`\`

**Visual Integration Problems:**

1. **Text Color Mismatch:**
   \`\`\`tsx
   // Get exact colors using browser dev tools
   // Right-click existing text → Inspect → Copy exact color value
   appearance: {
     variables: {
       colorForeground: '#exact-color-from-inspection'
     },
     elements: {
       notificationSubject: { color: 'var(--your-app-text-primary)' }
     }
   }
   \`\`\`

2. **Shape/Border Issues:**
   \`\`\`tsx
   // Use exact values from existing component inspection
   appearance: {
     variables: { borderRadius: '8px' }, // From button inspection
     elements: {
       inboxContainer: {
         borderRadius: '8px',
         width: '400px',
         maxHeight: '550px'
       }
     }
   }
   \`\`\`

**Performance Issues:**
\`\`\`tsx
// Prevent unnecessary re-renders
const subscriberId = useMemo(() => user?.id || 'anonymous', [user?.id]);
const appearance = useMemo(() => ({ 
  variables: { colorPrimary: '#your-color' } 
}), []);
\`\`\`

## Expected Deliverable

Provide a complete, working implementation that includes:

1. **Component file** with proper imports and integration
2. **Authentication integration** using the detected auth system
3. **Appearance configuration** with exact color values from the application
4. **Error handling** for edge cases (no user, network issues)
5. **Integration location** (where to place the component in the navigation)

The final implementation should require no additional configuration and work immediately when placed in the application.

## Success Measurement

The integration passes when:
- All critical validation items pass
- A developer unfamiliar with Novu assumes it's a native component
- Visual integration is seamless across desktop and mobile
- Component handles authentication and error states gracefully

If visual integration doesn't match after Level 1 implementation, escalate to Level 2 or 3 automatically.`;
