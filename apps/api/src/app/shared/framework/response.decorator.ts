/* eslint-disable @typescript-eslint/naming-convention */
import { ApiExtraModels, ApiOkResponse, ApiCreatedResponse, getSchemaPath } from '@nestjs/swagger';
import { Type, applyDecorators } from '@nestjs/common';
import { DataWrapperDto } from '../dtos/data-wrapper-dto';

export const ApiResponse = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
  statusCode: 200 | 201 = 200,
  isResponseArray = false
) => {
  const Response = statusCode === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiExtraModels(DataWrapperDto, dataDto),
    Response({
      schema: {
        properties: isResponseArray
          ? { data: { type: 'array', items: { $ref: getSchemaPath(dataDto) } } }
          : { data: { $ref: getSchemaPath(dataDto) } },
      },
    })
  );
};
