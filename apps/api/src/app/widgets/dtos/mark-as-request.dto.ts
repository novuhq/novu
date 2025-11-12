import { ApiProperty } from '@nestjs/swagger';
import { MessagesStatusEnum } from '@novu/shared';
import { IsDefined, IsEnum } from 'class-validator';
import { IsMongoIdOrArrayOfMongoIds } from '../../shared/validators/is-mongo-id-or-array-of-ids.validator';

export class MessageMarkAsRequestDto {
  @ApiProperty({
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    ],
  })
  @IsDefined()
  @IsMongoIdOrArrayOfMongoIds({ fieldName: 'messageId' })
  messageId: string | string[];

  @ApiProperty({
    enum: MessagesStatusEnum,
  })
  @IsDefined()
  @IsEnum(MessagesStatusEnum)
  markAs: MessagesStatusEnum;
}
