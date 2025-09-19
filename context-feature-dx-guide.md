# Novu Context Feature - Developer Experience Guide

## Overview

The **Context** feature in Novu provides a powerful way to attach structured metadata to workflow executions, enabling better organization, filtering, and data management across notifications. Context data flows through the entire notification lifecycle and is available in templates, conditions, and execution environments.

## High-Level Architecture

### Data Flow
1. **Input**: `ContextPayload` provided during trigger
2. **Processing**: Payload is parsed and resolved into stored `ContextEntity` records
3. **Storage**: Context keys are attached to `Job`, `Message`, and `Notification` entities
4. **Runtime**: Context is resolved to `ContextResolved` format for workflow execution

### Key Components
- **ContextPayload**: Raw input format from API/SDK
- **ContextEntity**: Persisted context records in database
- **ContextResolved**: Normalized format used in workflow execution
- **ContextKeys**: References stored on execution entities

## API Developer Experience

### Trigger Event with Context

```typescript
// REST API
POST /v1/events/trigger
{
  "name": "workflow-id",
  "to": "subscriber-id",
  "payload": { "message": "Hello" },
  "context": {
    "tenant": "org-acme",                    // Simple string
    "app": {                                 // Rich object
      "id": "jira", 
      "data": { "version": "8.0" }
    },
    "region": { "id": "us-east-1" }         // Object with empty data
  }
}
```

### Context Management API

```typescript
// Create/Update Context
POST /contexts
{
  "type": "tenant",
  "id": "org-acme", 
  "data": { "name": "Acme Corp", "plan": "enterprise" }
}

// Get Contexts
GET /contexts?type=tenant&limit=10

// Get Specific Context  
GET /contexts/tenant/org-acme

// Delete Context
DELETE /contexts/tenant/org-acme
```

### Validation & Constraints
- **Max 5 contexts** per trigger
- **ID format**: Alphanumeric, hyphens, underscores only (1-100 chars)
- **Data size limit**: ~50KB per context
- **Feature flag**: `IS_CONTEXT_ENABLED` controls availability

## Framework SDK Developer Experience

### Trigger with Context

```typescript
import { Client } from '@novu/framework';

const client = new Client({ secretKey: 'your-key' });

// Trigger workflow with context
await client.trigger('workflow-id', {
  to: 'subscriber-id',
  payload: { message: 'Hello' },
  context: {
    tenant: 'org-acme',
    app: { id: 'jira', data: { version: '8.0' } },
    region: { id: 'us-east-1' }
  }
});
```

### Workflow Execution Context

```typescript
import { workflow } from '@novu/framework';

const myWorkflow = workflow('my-workflow', async ({ step, context, payload, subscriber }) => {
  // Context is automatically resolved and available
  const tenantData = context.tenant;      // { id: 'org-acme', data: {...} }
  const appData = context.app;            // { id: 'jira', data: { version: '8.0' } }
  const regionData = context.region;      // { id: 'us-east-1', data: {} }

  await step.email('send-email', async () => ({
    subject: `Hello from ${tenantData.data.name}`,
    body: `App version: ${appData.data.version}`
  }));
});
```

## Data Persistence & Lifecycle

### Context Storage
- **ContextEntity**: Stored with `type:id` as unique key
- **Upsert logic**: Updates existing contexts or creates new ones
- **Data merging**: Explicit data provided always overwrites existing

### Entity Relationships
```typescript
// Context keys are stored on all execution entities
NotificationEntity {
  contextKeys: ['tenant:org-acme', 'app:jira', 'region:us-east-1']
}

MessageEntity {
  contextKeys: ['tenant:org-acme', 'app:jira', 'region:us-east-1']  
}

JobEntity {
  contextKeys: ['tenant:org-acme', 'app:jira', 'region:us-east-1']
}
```

## Template & Condition Usage

### In Templates
```handlebars
<!-- Email template -->
<h1>Hello from {{context.tenant.data.name}}</h1>
<p>Application: {{context.app.id}} v{{context.app.data.version}}</p>
<p>Region: {{context.region.id}}</p>
```

### In Conditions
```typescript
// Step conditions can reference context
if (context.tenant.data.plan === 'enterprise') {
  // Send premium notification
}
```

## Pros & Cons Analysis

### ✅ Pros

1. **Rich Metadata**: Support for both simple strings and complex objects
2. **Flexible Structure**: No predefined schema - adapt to any use case
3. **Lifecycle Integration**: Context flows through entire notification pipeline
4. **Query Capabilities**: Filter and search notifications by context
5. **Template Access**: Direct access in email/SMS/push templates
6. **Type Safety**: Strong TypeScript support in Framework SDK
7. **Upsert Logic**: Intelligent context management with updates
8. **Performance**: Efficient key-based storage and retrieval

### ❌ Cons

1. **Feature Flag Dependency**: Requires feature flag activation
2. **Limited Scale**: 5 context limit per trigger
3. **Size Constraints**: ~50KB limit per context data
4. **Learning Curve**: New concept requiring developer education
5. **Migration Complexity**: Existing workflows need updates to leverage context
6. **Validation Overhead**: Strict ID format requirements
7. **Storage Growth**: Additional database storage for context entities
8. **API Surface**: New endpoints increase API complexity

## Use Cases & Patterns

### Multi-Tenancy
```typescript
context: {
  tenant: { 
    id: 'org-acme', 
    data: { name: 'Acme Corp', plan: 'enterprise' } 
  }
}
```

### Application Context
```typescript
context: {
  app: { id: 'mobile-app', data: { version: '2.1.0', platform: 'ios' } },
  feature: { id: 'notifications', data: { enabled: true } }
}
```

### Geographic/Regional
```typescript
context: {
  region: { id: 'us-east-1', data: { timezone: 'America/New_York' } },
  country: { id: 'US', data: { currency: 'USD' } }
}
```

### User Segmentation
```typescript
context: {
  segment: { id: 'premium-users', data: { tier: 'gold' } },
  cohort: { id: '2024-q1', data: { signupDate: '2024-01-15' } }
}
```

## Migration Considerations

### Existing Workflows
- Context is optional - existing workflows continue to work
- Gradual adoption possible - add context incrementally
- Template updates needed to leverage context data

### Database Impact
- New `contexts` collection/table
- Additional fields on `jobs`, `messages`, `notifications`
- Potential storage growth with context data

### Performance
- Additional database queries for context resolution
- Caching opportunities for frequently used contexts
- Index optimization needed for context lookups

## Recommendations

### For Adoption
1. **Start Small**: Begin with 1-2 key contexts (e.g., tenant, app)
2. **Standardize Types**: Define consistent context type naming across teams
3. **Document Schemas**: Maintain clear documentation of context data structures
4. **Monitor Storage**: Track context data growth and storage usage
5. **Template Strategy**: Plan template updates to leverage context data

### Best Practices
1. **Consistent Naming**: Use kebab-case for context types (`user-segment`, not `userSegment`)
2. **Data Minimization**: Only store essential context data
3. **Validation**: Validate context data before triggering
4. **Error Handling**: Handle missing context gracefully in templates
5. **Testing**: Include context scenarios in workflow tests

---

*This guide provides a comprehensive overview of the Context feature's implementation and developer experience. The feature offers powerful metadata capabilities while requiring careful consideration of constraints and migration impact.*