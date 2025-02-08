import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { mixin } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

type Constructor<T = {}> = new (...args: any[]) => T;

export function withCursorPagination<TBase extends Constructor>(Base: TBase, options?: ApiPropertyOptions | undefined) {
  class ResponseDTO {
    @ApiProperty({
      isArray: true,
      type: Base,
      ...options,
    })
    @Type(() => Base)
    @ValidateNested({ each: true })
    data!: Array<InstanceType<TBase>>;

    @ApiProperty({
      description: 'The cursor for the next page of results, or null if there are no more pages.',
      type: String,
      nullable: true,
    })
    next: string | null;

    @ApiProperty({
      description: 'The cursor for the previous page of results, or null if this is the first page.',
      type: String,
      nullable: true,
    })
    previous: string | null;
  }

  return mixin(ResponseDTO); // This is important otherwise you will get always the same instance
}
