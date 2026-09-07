export type ImportRequirement = {
  /**
   * The name of the dependency.
   *
   * This is a necessary duplicate as ESM does not provide a consistent API for
   * reading the name of a dependency that can't be resolved.
   *
   * @example
   * ```typescript
   * 'module-name'
   * ```
   */
  name: string;
  /**
   * The import statement for the required dependency. An explicit `import('module-name')`
   * call with a static module string is necessary to ensure that the bundler will make
   * the dependency available for usage after tree-shaking. Without a static string,
   * tree-shaking may aggressively remove the import, making it unavailable.
   *
   * This syntax is required during synchronous declaration (e.g. on a class property),
   * but should only be awaited when you can handle a runtime import error.
   *
   * @example
   * ```typescript
   * import('module-name')
   * ```
   */
  import: Promise<{ default: unknown } & Record<string, unknown>>;
  /**
   * The required exports of the dependency. The availability of these exports are
   * checked by the import validator to verify the dependency is installed.
   *
   * @example
   * ```typescript
   * ['my-export']
   * ```
   */
  exports: readonly string[];
};
