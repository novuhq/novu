export const getResponse = (): typeof Response => {
  if (typeof Response !== 'undefined') {
    return Response;
  }

  return require('cross-fetch').Response;
};
