/**
 * Due some problems with Azure Redis DB that doesn't allow for certain
 * configuration values to be empty or have an empty string and as we don't
 * want to process them in our provider configuration files, we implement
 * this mapper function to be able to overcome that limitation in Azure
 * temporarily while we find a better solution
 */
export const convertStringValues = (value: string): string | null | undefined => {
  if (value === 'undefined') {
    return undefined;
  }
  if (value === 'null') {
    return null;
  }

  return value;
};
