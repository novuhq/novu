import { ChildDocs } from './ChildDocs';

/**
 * This is used to override the default loading of child docs as these docs
 * files does contain javascript we need to override them with react components.
 */
const globalOverrides = {
  frameworkterminal: {
    FrameworkTerminal: () => <nv-framework-terminal></nv-framework-terminal>,
  },
  // Needed for mdx file `quickstart/nextjs`
  framework: () => null,
};

/**
 * Global overrides need to override globals as they will not be correct loaded by
 * child docs as it is not possible to load javascript with child docs.
 */
export const createGlobals = (mappings) => ({
  ...Object.keys(mappings).reduce(
    (prev: Record<string, Record<string, any> | any>, key) => {
      const path = mappings[key];

      if (typeof path === 'string') {
        prev[key] = () => <ChildDocs path={path} />;

        return prev;
      }

      const value = path;

      prev[key] = Object.keys(value).reduce(
        (child: Record<string, any>, name) => ({
          ...child,
          [name]: () => <ChildDocs path={child[name]} />,
        }),
        {}
      );

      return prev;
    },
    {} as Record<string, Record<string, any> | any>
  ),
  ...globalOverrides,
});
