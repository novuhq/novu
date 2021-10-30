---
to: apps/api/src/app/<%= module %>/usecases/index.ts
inject: true
skip_if: <%= h.changeCase.pascal(name) %>
after: "const USE_CASES = \\["
eof_last: false
---
  <%= h.changeCase.pascal(name) %>,
