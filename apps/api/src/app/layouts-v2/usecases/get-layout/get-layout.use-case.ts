import { Injectable } from '@nestjs/common';
import { GetLayoutCommand } from './get-layout.command';
import { LayoutResponseDto } from '../../dtos';

@Injectable()
export class GetLayoutUseCase {
  async execute(command: GetLayoutCommand): Promise<LayoutResponseDto> {
    throw new Error('Method not implemented.');
  }
}
