export const safeParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};
