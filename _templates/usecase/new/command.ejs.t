---
to: apps/api/src/app/<%= module %>/usecases/<%= name %>/<%= name %>.command.ts
---
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class <%= h.changeCase.pascal(name) %>Command extends EnvironmentWithUserCommand {}


