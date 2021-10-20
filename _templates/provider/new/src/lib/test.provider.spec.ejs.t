---
    to: providers/<%= name %>/src/lib/<%= name %>.provider.spec.ts
---

import { <%= h.changeCase.pascal(name) %>EmailProvider } from './<%= name %>.provider';

test('should trigger <%= name %> library correctly', async () => {

});
