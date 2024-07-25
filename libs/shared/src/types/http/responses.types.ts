// eslint-disable-next-line no-restricted-imports, import/no-namespace
import * as nestSwagger from '@nestjs/swagger';

type NestJsExport = keyof typeof nestSwagger;
export type ApiResponseDecoratorName = NestJsExport & `Api${string}Response`;
