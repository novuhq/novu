import { CommandHelper } from '../../../shared/commands/command.helper';

export class SeedDataCommand {
  static create(data: SeedDataCommand) {
    return CommandHelper.create(SeedDataCommand, data);
  }
}
