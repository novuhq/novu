import { Transform } from 'class-transformer';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Trim = () => Transform(({ value }) => value?.trim());
