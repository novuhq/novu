import slugify from 'slugify';

export const slugifyName = (identifier: string): string => {
  return slugify(identifier, {
    lower: true,
    strict: true,
  });
};
