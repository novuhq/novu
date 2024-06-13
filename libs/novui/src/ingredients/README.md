# Ingredients

An _ingredient_ is not a built-in concept in Panda, but rather our own. It represents a reusable piece of styling (especially within recipes) that may not be able to be used via other built-in approaches.

We generate Ingredients using `css.raw({ /* ... */ })` such that we get type-safe use of the token system while outputting raw JavaScript objects (in the form of `SystemStyleObject`) that can then be used in recipes or directly into a className with `css()`.

### Caveats

Ingredients **should not** have dynamic / conditional logic that prevents Panda from being able to generate the styles statically.
