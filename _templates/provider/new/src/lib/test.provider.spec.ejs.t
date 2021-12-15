---
    to: providers/<%= name %>/src/lib/<%= name %>.provider.spec.ts
---

<% PascalName = h.changeCase.pascal(name) -%>
<% PascalType = h.changeCase.pascal(type) -%>
import { <%= PascalName %><%= PascalType %>Provider } from './<%= name %>.provider';

test('should trigger <%= name %> library correctly', async () => {

});
