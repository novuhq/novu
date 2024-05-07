/**
 * Indicates a string that is expect to already be localized before being passed as a parameter / prop.
 *
 * Note: this is forward-thinking to minimize accruing new tech debt when we implement i18n!
 */
export type LocalizedMessage = string | React.ReactNode | React.ReactNode[];
