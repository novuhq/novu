// to help with the different error structure between framework and api
export function getSimplifiedErrorObject(error: any) {
  return error && 'response' in error ? error?.response?.data : error;
}
