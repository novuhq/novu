export const arrayValuesEqual = (arr1?: Array<unknown>, arr2?: Array<unknown>) => {
  if (arr1 === arr2) {
    return true;
  }

  if (!arr1 || !arr2) {
    return false;
  }

  if (arr1.length !== arr2.length) {
    return false;
  }

  return arr1.every((value, index) => value === arr2[index]);
};
