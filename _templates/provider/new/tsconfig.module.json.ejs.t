---
    to: providers/<%= name %>/tsconfig.module.json
---

{
  "extends": "./tsconfig",
  "compilerOptions": {
    "target": "esnext",
    "outDir": "build/module",
    "module": "esnext"
  },
  "exclude": [
    "node_modules/**"
  ]
}
