export const sort = (array: number[]) => {
  array.sort((a, b) => a - b);

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
  return Array.from(new Set<number>(array));
};
