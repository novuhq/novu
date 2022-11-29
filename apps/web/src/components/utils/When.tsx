export const When = ({ truthy, children, fallback = null }) => (truthy ? children : null);
