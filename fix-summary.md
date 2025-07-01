# Test Workflow Drawer - Subscriber Selection Fix

## Problem
In the test workflow drawer, when searching for and selecting a new subscriber from the autocomplete, the UI would update to show the selected subscriber data, but when clicking "Test workflow", the backend request would still use the default subscriber instead of the newly selected one.

## Root Cause
The issue was in `apps/dashboard/src/components/workflow-editor/test-workflow/test-workflow-drawer.tsx`. The component had:

1. A form initialized with mock `to` data from `createMockObjectFromSchema(testData?.to ?? {})`
2. A `handleSubscriberSelect` callback that only updated the local `subscriberData` state
3. A form submission that used `data.to` from the form values, which still contained the original mock data

When a subscriber was selected via the autocomplete, it updated the UI state but **did not update the form's `to` field**. This meant the form submission continued to use the original placeholder values like `{{subscriberId}}`, `{{email}}`, etc., instead of the actual selected subscriber data.

## Solution
Added a `useEffect` hook that watches for changes to `subscriberData` and automatically updates the form's `to` field with the actual subscriber information:

```typescript
// Update form 'to' field when subscriber data changes
useEffect(() => {
  if (subscriberData) {
    // Create the 'to' object using actual subscriber data instead of mock placeholders
    const toValue: Record<string, unknown> = {};
    const toSchema = testData?.to;
    
    if (toSchema?.properties) {
      Object.keys(toSchema.properties).forEach((key) => {
        switch (key) {
          case 'subscriberId':
            toValue[key] = subscriberData.subscriberId || '';
            break;
          case 'email':
            toValue[key] = subscriberData.email || '';
            break;
          case 'firstName':
            toValue[key] = subscriberData.firstName || '';
            break;
          case 'lastName':
            toValue[key] = subscriberData.lastName || '';
            break;
          case 'phone':
            toValue[key] = subscriberData.phone || '';
            break;
          case 'avatar':
            toValue[key] = subscriberData.avatar || '';
            break;
          case 'locale':
            toValue[key] = subscriberData.locale || '';
            break;
          case 'timezone':
            toValue[key] = subscriberData.timezone || '';
            break;
          case 'data':
            toValue[key] = subscriberData.data || {};
            break;
          default:
            // For any other fields defined in the schema, use empty values
            toValue[key] = '';
            break;
        }
      });
    }
    
    setValue('to', toValue);
  }
}, [subscriberData, testData?.to, setValue]);
```

## Changes Made
1. Added `setValue` to the destructured form methods: `const { handleSubmit, watch, setValue } = form;`
2. Added the `useEffect` hook that maps subscriber data to form fields based on the schema
3. The effect runs whenever `subscriberData`, `testData?.to`, or `setValue` changes

## How It Works
1. When a user selects a subscriber from the autocomplete, `handleSubscriberSelect` updates `subscriberData`
2. The new `useEffect` detects the change and maps the subscriber data to the appropriate form fields
3. When the form is submitted, `data.to` now contains the actual subscriber data instead of mock placeholders
4. The `triggerWorkflow` function receives the correct subscriber information

## Testing
- The fix compiles successfully with TypeScript (`npm run build` passes)
- No breaking changes to existing functionality
- The form now properly syncs UI state with form values for accurate API requests

## Files Modified
- `apps/dashboard/src/components/workflow-editor/test-workflow/test-workflow-drawer.tsx`

This fix ensures that the selected subscriber is actually used in the workflow trigger request, resolving the issue where the default subscriber was always used regardless of the UI selection.
