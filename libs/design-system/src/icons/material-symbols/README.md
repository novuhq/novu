# Icon

## Plan

This directory, `material-symbols`, will be moved up one level in the file tree to (`src/icons`) once we remove all the older Icons from the design system. They have all been marked as deprecated in the meantime.

## Background

This group of icons comes from the [Material Symbols and Icons project](https://fonts.google.com/icons), but we are using a [3rd party library](https://fontsource.org/docs/getting-started/material-symbols) to assist with importing the icons. The icon set is **actually** a font with special behavior when you type certain text.

### A11y Context

Following this discussion [here](https://stackoverflow.com/questions/11135261/what-are-the-advantages-disadvantages-of-using-the-i-tag-for-icons-instead-of), we are using a `span` as the wrapper for the icons with role of `img` and a an `aria-label` to assist with screen readers.

## Use

To use an Icon, simply select the name (which should be auto-completed in your IDE thanks to TypeScript!):

```typescript
<Icon name={'home'} />
```
