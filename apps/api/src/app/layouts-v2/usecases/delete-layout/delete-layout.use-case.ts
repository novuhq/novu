import { Injectable } from '@nestjs/common';
import { DeleteLayoutCommand } from './delete-layout.command';

@Injectable()
export class DeleteLayoutUseCase {
  async execute(command: DeleteLayoutCommand): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
