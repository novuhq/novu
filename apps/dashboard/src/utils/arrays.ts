export const sort = (array: number[]) => {
  array.sort(function (a, b) {
    return a - b;
  });

  return array;
};

export const range = (start: number, end: number) => {
  const array: number[] = [];

  for (let i = start; i <= end; i++) {
    array.push(i);
  }

  return array;
};

export const dedup = (array: number[]) => {
  const result: number[] = [];

  array.forEach(function (i) {
    if (result.indexOf(i) < 0) {
      result.push(i);
    }
  });

  return result;
};
