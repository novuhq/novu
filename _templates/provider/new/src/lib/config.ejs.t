---
    to: providers/<%= name %>/src/lib/<%= name %>.config.ts
---
<% UpperType = h.changeCase.upper(type) -%>
<% PascalName = h.changeCase.pascal(name) -%>

export interface <%= PascalName %>Config {
  <%= UpperType === 'EMAIL' ? 'apiKey: string;' : null %>
}