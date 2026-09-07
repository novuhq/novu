type Scope = {
  start: number;
  end: number;
  variables: string[];
  type: 'global' | 'for' | 'tablerow' | 'capture';
};

// Regex patterns for LiquidJS syntax
const LIQUID_PATTERNS = {
  // Variable assignment
  assign: /{%-?\s*assign\s+(\w+)\s*=[^%]+-?%}/g,

  // Loop constructs
  for: /{%\s*for\s+(\w+)\s+in\s+[^%]+%}/g,
  endFor: /{%\s*endfor\s*%}/g,
  tablerow: /{%\s*tablerow\s+(\w+)\s+in\s+[^%]+%}/g,
  endTablerow: /{%\s*endtablerow\s*%}/g,

  // Capture blocks
  capture: /{%\s*capture\s+(\w+)\s*%}/g,
  endCapture: /{%\s*endcapture\s*%}/g,
} as const;

// Built-in Liquid loop object properties
const FORLOOP_VARIABLES = [
  'forloop',
  'forloop.index',
  'forloop.index0',
  'forloop.first',
  'forloop.last',
  'forloop.length',
  'forloop.rindex',
  'forloop.rindex0',
];

const TABLEROWLOOP_VARIABLES = [
  'tablerowloop',
  'tablerowloop.index',
  'tablerowloop.index0',
  'tablerowloop.first',
  'tablerowloop.last',
  'tablerowloop.length',
  'tablerowloop.col',
  'tablerowloop.col0',
  'tablerowloop.col_first',
  'tablerowloop.col_last',
  'tablerowloop.row',
];

/**
 * Creates a new RegExp instance from a pattern object
 */
function createRegex(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

/**
 * Checks if a variable is defined in the local LiquidJS context at a specific position
 * @param content - The full content of the editor
 * @param name - The variable name to check
 * @param position - The position in the content where the variable is used
 * @returns true if the variable is defined in a local scope at the given position
 *
 * Supports various LiquidJS constructs:
 * - for loops with ranges: {% for i in (1..5) %}
 * - for loops with collections: {% for product in collection.products %}
 * - tablerow loops
 * - capture blocks
 * - assign statements
 */
export function isVariableInLocalContext(content: string, name: string, position: number): boolean {
  // Extract the root variable name (e.g., "product" from "product.title")
  const rootName = name.split('.')[0];

  // Get all variables available at this position
  const availableVariables = getVariablesAtPosition(content, position);

  return availableVariables.includes(rootName) || availableVariables.includes(name);
}

/**
 * Gets all variables available at a specific position in the content. Includes forloop and tablerowloop variables.
 */
function getVariablesAtPosition(content: string, position: number): string[] {
  const availableVariables: string[] = [];
  const seen = new Set<string>();

  // Parse all scopes in the content
  const allScopes = parseAllScopes(content);

  // Find scopes that contain the position and collect their variables
  for (const scope of allScopes) {
    if (position >= scope.start && position <= scope.end) {
      scope.variables.forEach((v) => {
        if (!seen.has(v)) {
          availableVariables.push(v);
          seen.add(v);
        }
      });
    }
  }

  return availableVariables.reverse();
}

export function getVariablesAtPositionWithLoopProperties(content: string, position: number): string[] {
  const availableVariables = getVariablesAtPosition(content, position);
  return availableVariables.filter((v) => !v.startsWith('forloop') && !v.startsWith('tablerowloop'));
}

/**
 * Parses all LiquidJS scopes in the content
 */
function parseAllScopes(content: string): Scope[] {
  const scopes: Scope[] = [];

  // Track global variables from assign statements
  const globalAssigns: string[] = [];

  // First pass: find all assign statements that create global variables
  const assignRegex = createRegex(LIQUID_PATTERNS.assign);
  let assignMatch: RegExpExecArray | null;

  while ((assignMatch = assignRegex.exec(content)) !== null) {
    const varName = assignMatch[1];
    const position = assignMatch.index;

    // Check if this assign is inside a block scope
    if (!isInsideBlockScope(content, position)) {
      globalAssigns.push(varName);
    }
  }

  // Add global scope for assign variables
  if (globalAssigns.length > 0) {
    scopes.push({
      start: 0,
      end: content.length,
      variables: globalAssigns,
      type: 'global',
    });
  }

  // Second pass: find all block scopes
  parseBlockScopes(content, scopes);

  return scopes;
}

/**
 * Checks if a position is inside any block scope
 */
function isInsideBlockScope(content: string, position: number): boolean {
  const blockStarts = [LIQUID_PATTERNS.for, LIQUID_PATTERNS.tablerow, LIQUID_PATTERNS.capture];

  const blockEnds = [LIQUID_PATTERNS.endFor, LIQUID_PATTERNS.endTablerow, LIQUID_PATTERNS.endCapture];

  for (let i = 0; i < blockStarts.length; i++) {
    const startRegex = createRegex(blockStarts[i]);
    const endRegex = createRegex(blockEnds[i]);

    let startMatch: RegExpExecArray | null;

    while ((startMatch = startRegex.exec(content)) !== null) {
      const blockStart = startMatch.index;

      // Find corresponding end tag
      endRegex.lastIndex = blockStart;
      const endMatch = endRegex.exec(content);

      if (endMatch && position >= blockStart && position <= endMatch.index + endMatch[0].length) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parses block scopes (for, tablerow, capture)
 */
function parseBlockScopes(content: string, scopes: Scope[]): void {
  // Parse for loops
  parseForLoops(content, scopes);

  // Parse tablerow loops
  parseTablerowLoops(content, scopes);

  // Parse capture blocks
  parseCaptureBlocks(content, scopes);
}

/**
 * Parses for loops and their scopes
 * Supports various for loop patterns:
 * - Range expressions: {% for i in (1..5) %}
 * - Collection variables: {% for product in collection.products %}
 * - Array variables: {% for item in items %}
 */
function parseForLoops(content: string, scopes: Scope[]): void {
  // Matches for loops with any expression after 'in'
  // Captures the iterator variable name (e.g., 'i', 'product', 'item')
  const forRegex = createRegex(LIQUID_PATTERNS.for);
  const endForRegex = createRegex(LIQUID_PATTERNS.endFor);

  let match: RegExpExecArray | null;

  while ((match = forRegex.exec(content)) !== null) {
    const iteratorVar = match[1];
    const start = match.index;

    // Find the corresponding endfor
    endForRegex.lastIndex = start;
    const endMatch = endForRegex.exec(content);

    if (endMatch) {
      // Order: iterator variable first, then forloop, then nested assigns
      const scopeVariables: string[] = [...FORLOOP_VARIABLES, iteratorVar];

      // Check for nested assigns within this for loop
      const blockContent = content.substring(start, endMatch.index + endMatch[0].length);
      const nestedAssignRegex = createRegex(LIQUID_PATTERNS.assign);
      let nestedAssign: RegExpExecArray | null;

      while ((nestedAssign = nestedAssignRegex.exec(blockContent)) !== null) {
        scopeVariables.push(nestedAssign[1]);
      }

      scopes.push({
        start,
        end: endMatch.index + endMatch[0].length,
        variables: scopeVariables,
        type: 'for',
      });
    }
  }
}

/**
 * Parses tablerow loops and their scopes
 * Supports various tablerow patterns similar to for loops:
 * - Range expressions: {% tablerow i in (1..5) %}
 * - Collection variables: {% tablerow product in collection.products %}
 * - Array variables: {% tablerow item in items %}
 */
function parseTablerowLoops(content: string, scopes: Scope[]): void {
  // Matches tablerow loops with any expression after 'in'
  // Captures the iterator variable name
  const tablerowRegex = createRegex(LIQUID_PATTERNS.tablerow);
  const endTablerowRegex = createRegex(LIQUID_PATTERNS.endTablerow);

  let match: RegExpExecArray | null;

  while ((match = tablerowRegex.exec(content)) !== null) {
    const iteratorVar = match[1];
    const start = match.index;

    // Find the corresponding endtablerow
    endTablerowRegex.lastIndex = start;
    const endMatch = endTablerowRegex.exec(content);

    if (endMatch) {
      // Order: iterator variable first, then tablerowloop, then nested assigns
      const scopeVariables: string[] = [...TABLEROWLOOP_VARIABLES, iteratorVar];

      // Check for nested assigns
      const blockContent = content.substring(start, endMatch.index + endMatch[0].length);
      const nestedAssignRegex = createRegex(LIQUID_PATTERNS.assign);
      let nestedAssign: RegExpExecArray | null;

      while ((nestedAssign = nestedAssignRegex.exec(blockContent)) !== null) {
        scopeVariables.push(nestedAssign[1]);
      }

      scopes.push({
        start,
        end: endMatch.index + endMatch[0].length,
        variables: scopeVariables,
        type: 'tablerow',
      });
    }
  }
}

/**
 * Parses capture blocks and their scopes
 */
function parseCaptureBlocks(content: string, scopes: Scope[]): void {
  const captureRegex = createRegex(LIQUID_PATTERNS.capture);
  const endCaptureRegex = createRegex(LIQUID_PATTERNS.endCapture);

  let match: RegExpExecArray | null;

  while ((match = captureRegex.exec(content)) !== null) {
    const captureVar = match[1];
    const start = match.index;

    // Find the corresponding endcapture
    endCaptureRegex.lastIndex = start;
    const endMatch = endCaptureRegex.exec(content);

    if (endMatch) {
      // The captured variable is available after the capture block ends
      // But only if the capture is not inside another block
      const captureEnd = endMatch.index + endMatch[0].length;

      if (!isInsideBlockScope(content, start)) {
        // Global capture - variable available after capture
        scopes.push({
          start: captureEnd,
          end: content.length,
          variables: [captureVar],
          type: 'capture',
        });
      } else {
        // Capture inside a block - find parent block and add to its scope
        for (const scope of scopes) {
          if (start >= scope.start && captureEnd <= scope.end && (scope.type === 'for' || scope.type === 'tablerow')) {
            scope.variables.push(captureVar);
            break;
          }
        }
      }
    }
  }
}
