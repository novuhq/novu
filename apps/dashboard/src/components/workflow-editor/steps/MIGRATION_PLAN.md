# PreviewContextPanel Refactoring Migration Plan

## Overview

This document outlines the migration plan for refactoring the `PreviewContextPanel` component to reduce complexity and improve maintainability while preserving all existing functionality.

## Problems Addressed

### 1. Complex Initialization State Machine

- **Before**: 4-state machine (`idle` → `initializing` → `initialized` → `ready`)
- **After**: Simple boolean flag handled in dedicated hook

### 2. Multiple UseEffects

- **Before**: 3 separate useEffects with complex dependencies
- **After**: Consolidated into single initialization hook

### 3. Scattered Logic

- **Before**: Data merging, persistence, and initialization logic mixed in component
- **After**: Clean separation of concerns with dedicated hooks

## Key Changes

### 1. New Hook: `usePreviewDataInitialization`

- Consolidates all initialization logic
- Handles persisted data loading
- Manages server defaults merging
- Single source of truth for initialization state

### 2. Simplified Component Structure

- Removed state machine complexity
- Extracted constants (DEFAULT_SUBSCRIBER_DATA)
- Cleaner handler functions
- More readable code flow

### 3. Improved Data Flow

```
Component Mount
    ↓
usePreviewDataInitialization (handles all init logic)
    ↓
usePreviewContext (manages state and updates)
    ↓
usePersistedPreviewContext (handles persistence)
```

## Migration Steps

### Phase 1: Add New Hook (Completed ✓)

1. Create `use-preview-data-initialization.ts`
2. Move initialization logic from component
3. Simplify state management

### Phase 2: Refactor Component (Completed ✓)

1. Remove initialization state machine
2. Remove multiple useEffects
3. Use new initialization hook
4. Simplify handler functions

### Phase 3: Testing & Validation

1. **Functionality Tests**:

   - [ ] Persisted data loads correctly on mount
   - [ ] Server defaults apply when no persisted data
   - [ ] Payload merging works with schema enabled
   - [ ] Subscriber data persists across sessions
   - [ ] Clear functions reset to correct defaults

2. **Edge Cases**:

   - [ ] Empty initial value (`{}`)
   - [ ] Missing workflow/environment data
   - [ ] Malformed persisted data
   - [ ] Schema enabled/disabled transitions

3. **Performance**:
   - [ ] No unnecessary re-renders
   - [ ] Initialization happens only once
   - [ ] Persistence debouncing works

## Validation Checklist

### Before Deployment

- [ ] All existing unit tests pass
- [ ] E2E tests for preview panel pass
- [ ] Manual testing of persistence features
- [ ] Performance metrics remain stable
- [ ] No console errors or warnings

### User-Facing Behavior (Must Remain Unchanged)

1. **Data Persistence**:

   - Payload data persists per workflow/environment
   - Subscriber data persists per workflow/environment
   - 90-day TTL for persisted data

2. **Initialization Priority**:

   - Persisted data takes precedence
   - Server defaults apply for missing fields
   - Empty objects handled gracefully

3. **Clear Functions**:
   - Clear payload resets to server defaults (if available)
   - Clear subscriber resets to mock data
   - Step results unaffected by clear operations

## Rollback Plan

If issues are discovered:

1. Revert to original `preview-context-panel.tsx`
2. Remove `use-preview-data-initialization.ts`
3. No changes to existing hooks needed

## Benefits

1. **Maintainability**: Easier to understand and modify
2. **Testability**: Logic isolated in dedicated hooks
3. **Performance**: Reduced complexity and re-renders
4. **Reliability**: Clearer data flow reduces bugs

## Next Steps

1. Run comprehensive test suite
2. Deploy to staging environment
3. Monitor for any issues
4. Deploy to production with feature flag (if applicable)
