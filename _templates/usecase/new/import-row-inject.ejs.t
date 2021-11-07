---
to: apps/api/src/app/<%= module %>/usecases/index.ts
inject: true
skip_if: import { <%= h.changeCase.pascal(name) %>
prepend: true
eof_last: false
---
import { <%= h.changeCase.pascal(name) %> } from './<%= name %>/<%= name %>.usecase';
