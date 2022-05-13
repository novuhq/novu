# Vue 3 + Typescript + Vite + Storybook + ESLint + Prettier

## Create stories with Typescript

You can write stories with JavaScript or Typescript alike as both your dev server and storybook server allow it. Start writing stories with [this introduction](https://storybook.js.org/docs/react/writing-stories/introduction)

## ESLint

Change your config at `.eslintrc.js`

## Prettier

Change config at `.prettierrc`

## Scripts

```js
yarn // installs packages
yarn vite // starts the dev server
yarn build // run build
yarn serve // preview build
yarn storybook // starts storybook
yarn lint // lint and fix all files
yarn format // run prettier on all files
```

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar)

## Type Support For `.vue` Imports in TS

Since TypeScript cannot handle type information for `.vue` imports, they are shimmed to be a generic Vue component type by default. In most cases this is fine if you don't really care about component prop types outside of templates. However, if you wish to get actual prop types in `.vue` imports (for example to get props validation when using manual `h(...)` calls), you can enable Volar's `.vue` type support plugin by running `Volar: Switch TS Plugin on/off` from VSCode command palette.
