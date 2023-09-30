---
to: apps/api/src/app/<%= name %>/<%= name %>.module.ts
---
import { Module } from '@nestjs/common';
import { USE_CASES } from './usecases';
import { <%= h.changeCase.pascal(name) %>Controller } from './<%= name %>.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [...USE_CASES],
  controllers: [<%= h.changeCase.pascal(name) %>Controller],
})
export class <%= h.changeCase.pascal(name) %>Module {}
