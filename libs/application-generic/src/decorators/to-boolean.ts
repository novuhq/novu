import { Transform } from 'class-transformer';

// use this transformer in combination with @IsBoolean validator.

export const TransformToBoolean = () =>
  Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;

    return value; // @IsBoolean validator should reject non-boolean value.
  });
