import { ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dtos/pagination-response';
import { Type, applyDecorators } from '@nestjs/common';
import { ApiOkResponse } from './response.decorator';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ApiOkPaginatedResponse = <DataDto extends Type<unknown>>(dataDto: DataDto) =>
  applyDecorators(
    ApiExtraModels(PaginatedResponseDto, dataDto),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataDto) },
              },
            },
          },
        ],
      },
    })
  );
