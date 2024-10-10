import slugify from 'slugify';

export const slugifyIdentifier = (identifier: string): string => {
  return slugify(identifier, {
    lower: true,
    strict: true,
  });
};
