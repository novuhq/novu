# Vue 3 + i18n + Typescript + Vite + Storybook + ESLint + Prettier

This template should help get you started developing with Vue 3 and Typescript in Vite.
The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Create stories with Typescript

You can write stories with JavaScript or Typescript alike as both your dev server and storybook server allow it. Start writing stories with [this introduction](https://storybook.js.org/docs/react/writing-stories/introduction)

## Add translations to locales files

Translations are ready to go with [vue-i18](https://vue-i18n.intlify.dev/)
Add your files to `/locales` and are you are set.

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

## Folder structure

```
.
├── LICENSE
├── README.md
├── index.html
├── package.json
├── public
│   ├── favicon.ico
│   ├── robots.txt
│   └── svg
│       ├── eslint.svg
│       ├── prettier.svg
│       ├── storybook.svg
│       ├── ts.svg
│       ├── vite.svg
│       └── vue.svg
├── src
│   ├── App.vue
│   ├── assets
│   │   └── fonts
│   │       └── overpass-regular.otf
│   ├── components
│   │   ├── HelloWorld.vue
│   │   └── LocaleSelect.vue
│   ├── data
│   │   └── links.json
│   ├── locales
│   │   ├── en.json
│   │   ├── pt.json
│   │   └── zh.json
│   ├── main.ts
│   ├── shims-vue.d.ts
│   ├── stories
│   │   ├── BasicButton.stories.ts
│   │   ├── BasicButton.vue
│   │   ├── Header.stories.js
│   │   ├── Header.vue
│   │   ├── Introduction.stories.mdx
│   │   ├── Page.stories.js
│   │   ├── Page.vue
│   │   ├── assets
│   │   │   ├── code-brackets.svg
│   │   │   ├── colors.svg
│   │   │   ├── comments.svg
│   │   │   ├── direction.svg
│   │   │   ├── flow.svg
│   │   │   ├── plugin.svg
│   │   │   ├── repo.svg
│   │   │   └── stackalt.svg
│   │   ├── header.css
│   │   └── page.css
│   ├── styles
│   │   ├── _colors.scss
│   │   ├── _font.scss
│   │   ├── _reset.scss
│   │   ├── boot.scss
│   │   └── functions
│   │       └── _color.scss
│   └── types
│       └── Size.ts
├── tsconfig.json
├── vite.config.ts
└── yarn.lock
```
