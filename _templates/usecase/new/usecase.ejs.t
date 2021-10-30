---
to: apps/api/src/app/<%= module %>/usecases/<%= name %>/<%= name %>.usecase.ts
---
import { Injectable } from '@nestjs/common';
import { <%= h.changeCase.pascal(name) %>Command } from './<%= name %>.command';

@Injectable()
export class <%= h.changeCase.pascal(name) %> {
  constructor() {}

  async execute(command: <%= h.changeCase.pascal(name) %>Command): Promise<string> {
    return 'Is working';
  }
}
