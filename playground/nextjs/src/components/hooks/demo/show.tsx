export const Show = ({ when, children, fallback }: any) => {
  if (when) {
    return children;
  } else {
    return fallback;
  }
};
