module.exports = {
  'no-class-without-style': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Enforce the use of style() function for class attributes',
        category: 'Possible Errors',
        recommended: false,
      },
      fixable: null,
      schema: [], // no options
    },
    create: function (context) {
      return {
        JSXAttribute(node) {
          if (!node.name || node.name.name !== 'class') {
            return;
          }

          const parentElement = node.parent;
          if (parentElement.attributes.some((attr) => attr.name && attr.name.name === 'appearanceKey')) {
            return; // Skip if appearanceKey is present
          }

          const attributeValueNode = node.value;

          if (!attributeValueNode) {
            // class (boolean prop) or no value.
            return;
          }

          // Case 1: Literal string value, e.g. class="foo"
          if (attributeValueNode.type === 'Literal') {
            const classString = String(attributeValueNode.value); // Ensure it's a string
            if (!classString.includes('style(')) {
              context.report({
                node,
                message:
                  'Class attributes using string literals must directly include style(). For example: class="style(\'...\')"',
              });
            }
            return;
          }

          // Case 2: JSX Expression Container, e.g. class={expression}
          if (attributeValueNode.type === 'JSXExpressionContainer') {
            const expression = attributeValueNode.expression;
            // It's possible for expression to be null in rare cases like class={/* comment only */}, though ESLint might parse this differently.
            if (!expression) {
              context.report({
                node,
                message: 'Class attribute expressions must not be empty.',
              });
              return;
            }

            const expressionText = context.getSourceCode().getText(expression);

            // If the expression itself contains style(), it's valid.
            if (expressionText.includes('style(')) {
              return;
            }

            // If the expression is an Identifier (a variable), check its definition.
            if (expression.type === 'Identifier') {
              const variableName = expression.name;
              let scope = context.getScope();
              let variable = null;

              while (scope) {
                const foundVar = scope.variables.find((v) => v.name === variableName);
                if (foundVar) {
                  variable = foundVar;
                  break;
                }
                scope = scope.upper;
              }

              if (variable && variable.defs && variable.defs.length > 0) {
                const definitionEntry = variable.defs[0];

                if (
                  definitionEntry.node &&
                  definitionEntry.node.type === 'VariableDeclarator' &&
                  definitionEntry.node.init
                ) {
                  const initializer = definitionEntry.node.init;
                  const initializerText = context.getSourceCode().getText(initializer);
                  if (initializerText.includes('style(')) {
                    return; // Variable was initialized with style(), OK
                  }
                }
              }

              context.report({
                node,
                message: `If using a variable \`${variableName}\` for a class, it must be initialized using style(). For example: const ${variableName} = style('...');`,
              });
              return;
            }

            // If it's an expression container, not an identifier, and expressionText doesn't include style()
            context.report({
              node,
              message: 'Class attributes with expressions must use style() or a variable initialized with style().',
            });
            return;
          }
        },
      };
    },
  },
};
