---
to: apps/api/src/app/<%= module %>/usecases/<%= name %>/<%= name %>.command.ts
---
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class <%= h.changeCase.pascal(name) %>Command extends EnvironmentWithUserCommand {
  static create(data: <%= h.changeCase.pascal(name) %>Command) {
    return CommandHelper.create<<%= h.changeCase.pascal(name) %>Command>(<%= h.changeCase.pascal(name) %>Command, data);
  }
}


