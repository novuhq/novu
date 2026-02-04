export const getVariableSchemaPrompt = (variableSchemaPrompt: string): string => {
  return `Available Variables Context
IMPORTANT: When using variables, prefer reusing the existing variables listed below to maintain consistency across the workflow.
- Only introduce new "payload.*" variables if they are truly needed for this step's specific content.

Variable Semantics
IMPORTANT: Always use the variables in the appropriate context when the content is created. Never introduce new variables into the "system" namespace.
- (system) workflow.*: Current workflow meta data like workflowId, name, description, tags, severity, etc.
- (system) subscriber.*: Subscriber's / recipient's personal information like first name, last name, email, phone, etc.
- (user defined) payload.*: Payload's data like action URL, product name, order number, etc.
- (system) steps.*: Steps's data like events, event count, in the digest step, etc.
- (user defined) context.*: Context is a user-defined data object that stores metadata (like tenant, region, or app details) to organize and personalize notifications.

${variableSchemaPrompt}`;
};
