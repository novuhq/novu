import 'reflect-metadata';
import { IsBoolean, IsEnum, IsIn, IsNumber, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

enum TestEnum {
  A = 'A',
  B = 'B',
  C = 'C',
}

export class StringSchema {
  @IsString()
  name!: string;
}

class NestedChildrenSchema {
  @IsNumber()
  age!: number;
}

export class NestedSchema {
  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => NestedChildrenSchema)
  nested!: NestedChildrenSchema;
}
export class NestedArraySchema {
  @IsString()
  name!: string;

  @ValidateNested({ each: true })
  @Type(() => NestedChildrenSchema)
  nested!: NestedChildrenSchema[];
}

export class StringAndNumberSchema {
  @IsString()
  name!: string;
  @IsNumber()
  age!: number;
}

export class SimpleTestEnumSchema {
  @IsString()
  @IsEnum(TestEnum)
  enum?: TestEnum;
}

export class UnionSchema {
  @IsIn(['stringType', 'numberType', 'booleanType'])
  type!: 'stringType' | 'numberType' | 'booleanType';

  @ValidateIf((obj) => obj.type === 'stringType')
  @IsString()
  stringVal?: string;

  @ValidateIf((obj) => obj.type === 'numberType')
  @IsNumber()
  numVal?: number;

  @ValidateIf((obj) => obj.type === 'booleanType')
  @IsBoolean()
  boolVal?: boolean;
}
