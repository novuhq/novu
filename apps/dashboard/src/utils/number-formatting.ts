export function getCompactFormat(num: number) {
  if (num >= 1000000000) {
    return {
      value: num / 1000000000,
      suffix: 'B',
    };
  }
  if (num >= 1000000) {
    return {
      value: num / 1000000,
      suffix: 'M',
    };
  }
  if (num >= 1000) {
    return {
      value: num / 1000,
      suffix: 'K',
    };
  }
  return {
    value: num,
    suffix: '',
  };
}

export function parseFormattedNumber(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  // Parse the already-formatted value back to a number
  // If value is like "8.2M", convert it back to 8200000
  if (value.includes('M')) {
    return parseFloat(value.replace('M', '')) * 1000000;
  } else if (value.includes('K')) {
    return parseFloat(value.replace('K', '')) * 1000;
  } else if (value.includes('B')) {
    return parseFloat(value.replace('B', '')) * 1000000000;
  } else {
    return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
  }
}
