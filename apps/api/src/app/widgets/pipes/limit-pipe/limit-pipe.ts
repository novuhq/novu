import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';

export class LimitPipe implements PipeTransform {
  private readonly minInt: number;
  private readonly maxInt: number;
  private readonly isOptional: boolean;

  constructor(minInt: number, maxInt: number, isOptional = false) {
    this.minInt = minInt;
    this.maxInt = maxInt;
    this.isOptional = isOptional;
  }

  transform(value: number | undefined | null, metadata: ArgumentMetadata) {
    if (this.isOptional && (value === null || value === undefined)) {
      return value;
    }

    if (!this.isOptional && (value === null || value === undefined)) {
      throw new BadRequestException(`${metadata.data} must be a number conforming to the specified constraints`);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (value! < this.minInt) {
      throw new BadRequestException(`${metadata.data} must not be less than ${this.minInt}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (value! > this.maxInt) {
      throw new BadRequestException(`${metadata.data} must not be greater than ${this.maxInt}`);
    }

    return value;
  }
}
