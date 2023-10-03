export const isBrowser = () => typeof window !== 'undefined';
export const isCypress = (isBrowser() && (window as any).Cypress) || (isBrowser() && (window as any).parent.Cypress);
