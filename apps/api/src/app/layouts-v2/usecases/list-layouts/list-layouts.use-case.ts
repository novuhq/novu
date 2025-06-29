import { Injectable } from '@nestjs/common';
import { ListLayoutsCommand } from './list-layouts.command';
import { ListLayoutResponseDto } from '../../dtos';

@Injectable()
export class ListLayoutsUseCase {
  async execute(command: ListLayoutsCommand): Promise<ListLayoutResponseDto> {
    throw new Error('Method not implemented.');
  }
}
