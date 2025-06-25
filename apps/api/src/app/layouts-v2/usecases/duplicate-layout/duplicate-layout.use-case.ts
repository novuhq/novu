import { Injectable } from '@nestjs/common';
import { DuplicateLayoutCommand } from './duplicate-layout.command';
import { LayoutResponseDto } from '../../dtos';

@Injectable()
export class DuplicateLayoutUseCase {
  async execute(command: DuplicateLayoutCommand): Promise<LayoutResponseDto> {
    throw new Error('Method not implemented.');
  }
}
