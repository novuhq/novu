/**
 * Type a constructor parameter injected with `@Inject(forwardRef(() => X))` as `WrapperType<X>`, not `X`.
 * With `X` the decorator metadata reads the class while the circular import is still loading, which throws
 * `Cannot access 'X' before initialization` now that classes compile natively; the alias emits `Object` instead.
 * https://docs.nestjs.com/recipes/swc#common-pitfalls
 */
export type WrapperType<T> = T;
