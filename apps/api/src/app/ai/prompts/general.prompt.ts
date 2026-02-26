export const getVariableSchemaPrompt = (variableSchemaPrompt: string): string => {
  return `Available Variables
Prefer reusing existing variables for consistency. Only introduce new "payload.*" variables when truly needed.

Variable Namespaces:
- workflow.*: (system) workflow metadata - workflowId, name, description, tags, severity
- subscriber.*: (system) recipient info - firstName, lastName, email, phone
- payload.*: (user defined) event data - actionUrl, productName, orderNumber
- steps.*: (system) step data - events, eventCount (digest step)
- context.*: (user defined) metadata - tenant, region, app details

${variableSchemaPrompt}`;
};
