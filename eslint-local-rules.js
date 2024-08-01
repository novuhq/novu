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
          if (node.name && node.name.name === 'class') {
            const parentElement = node.parent;
            const hasAppearanceKey = parentElement.attributes.some(
              (attr) => attr.name && attr.name.name === 'appearanceKey'
            );

            if (hasAppearanceKey) {
              return; // Skip reporting if appearanceKey is present, as it is most likely forwarded.
            }

            const value = context.getSourceCode().getText(node.value);
            if (!value.includes('style(')) {
              context.report({
                node,
                message: 'Class attributes must use the style() function.',
              });
            }
          }
        },
      };
    },
  },
};
