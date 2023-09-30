---
to: apps/api/src/app/<%= name %>/<%= name %>.controller.ts
---
import { Controller } from '@nestjs/common';

@Controller('/<%= name %>')
export class <%= h.changeCase.pascal(name) %>Controller {
  constructor() {}
}
