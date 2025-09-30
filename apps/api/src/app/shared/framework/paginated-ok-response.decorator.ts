import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dtos/pagination-response';
import { ApiOkResponse } from './response.decorator';

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
