import type { ClerkProvider } from '@clerk/nextjs';
import type { ComponentProps } from 'react';

type ClerkProviderProps = ComponentProps<typeof ClerkProvider>;

const BUTTON_TEXT = 'text-sm leading-[21px] font-medium';
const SMALL_TEXT = 'text-[13px] leading-4.5';
const FIELD_RING = 'rounded bg-background ring-1 ring-border ring-inset shadow-none';
const QUICK_COLORS = 'transition-colors duration-150 motion-reduce:transition-none';
/** Clerk's layer sits above the one that gives buttons and links this outline (`globals.css`), so it is set again. */
const FOCUS_OUTLINE = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';
const LINK = `${SMALL_TEXT} rounded-sm font-medium text-accent underline-offset-4 hover:underline ${FOCUS_OUTLINE}`;
const QUIET_LINK = `rounded-sm font-mono text-[11px] leading-4 text-muted hover:text-foreground ${QUICK_COLORS} ${FOCUS_OUTLINE}`;

/**
 * Clerk's sign-in and sign-up forms in our design (Figma: Account :: Sign in). The colors are the tokens of
 * `src/styles/globals.css`. Each key of `elements` is a part of Clerk's forms (`cl-…` on the page), and takes
 * our utilities: they win over Clerk's own styles because those sit in the `clerk` layer.
 */
export const humanClerkAppearance: ClerkProviderProps['appearance'] = {
  cssLayerName: 'clerk',
  variables: {
    colorPrimary: '#ff5c30',
    colorPrimaryForeground: '#0a0908',
    colorBackground: '#0a0908',
    colorForeground: '#ebe2d6',
    colorMutedForeground: '#8f887d',
    colorNeutral: '#ebe2d6',
    colorInput: '#0a0908',
    colorInputForeground: '#ebe2d6',
    colorBorder: '#1f1d1a',
    colorDanger: '#fb3748',
    borderRadius: '0.25rem',
    fontFamily: 'var(--font-geist), sans-serif',
  },
  options: {
    socialButtonsPlacement: 'top',
    socialButtonsVariant: 'blockButton',
    // The name stays on the sign-up form whether the Clerk app requires it or leaves it optional.
    showOptionalFields: true,
  },
  elements: {
    // No card of Clerk's: the form sits on the page, in the column of `AuthFrame`.
    rootBox: 'w-full',
    // Clerk clips the card's box, which would cut off the focus glow of the fields.
    cardBox: 'w-full overflow-visible rounded-none border-0 bg-transparent shadow-none',
    card: 'mx-0 w-full animate-rise-in gap-4.5 rounded-none border-0 bg-transparent p-0 shadow-none motion-reduce:animate-none',
    main: 'gap-4.5',
    footer: 'mt-4.5 items-start rounded-none border-0 bg-none p-0',
    footerAction: 'mx-0 justify-start gap-1 p-0',
    footerActionText: `${SMALL_TEXT} text-secondary`,
    footerActionLink: LINK,
    backRow: 'justify-start self-start',
    backLink: LINK,

    header: 'items-start text-left [&>div]:w-full [&>div]:items-start [&>div]:gap-4.5',
    headerTitle: 'text-2xl leading-7.5 font-normal tracking-[-0.48px] text-foreground',
    headerSubtitle: `${SMALL_TEXT} text-left text-secondary`,
    identityPreview: 'justify-start gap-1.5 p-0',
    identityPreviewText: `${SMALL_TEXT} text-foreground`,
    identityPreviewEditButton: `rounded-sm text-muted hover:text-foreground ${QUICK_COLORS} ${FOCUS_OUTLINE}`,
    identityPreviewEditButtonIcon: 'size-3.5',

    socialButtons: 'grid-cols-1 gap-4.5',
    socialButtonsBlockButton: `h-10 w-full justify-center gap-1.5 px-4 hover:bg-raised ${QUICK_COLORS} ${FOCUS_OUTLINE} ${FIELD_RING}`,
    socialButtonsBlockButtonText: `${BUTTON_TEXT} text-foreground`,
    socialButtonsProviderIcon: 'size-3.5',

    dividerRow: 'gap-3',
    dividerLine: 'bg-border',
    dividerText: 'mx-0 font-mono text-[11px] leading-4 text-muted',

    form: 'gap-4.5 [&>div]:gap-4.5',
    formFieldRow: 'gap-3',
    formField: 'gap-1.5',
    formFieldLabelRow: 'mb-0',
    formFieldLabel: `${SMALL_TEXT} font-medium text-foreground`,
    formFieldAction: QUIET_LINK,
    formFieldHintText: 'hidden',
    // Every checkbox. Clerk counts some as a `formFieldInput` too, so this has to outweigh those styles.
    checkbox: `size-3.5! max-h-3.5! p-0! ring-1 ring-border-strong ring-inset checked:bg-accent! checked:ring-accent focus:shadow-none! ${FOCUS_OUTLINE}`,
    formFieldCheckboxLabel: `${SMALL_TEXT} text-secondary [&_a]:rounded-sm [&_a]:font-medium [&_a]:text-accent`,
    formFieldRadioLabel: `${SMALL_TEXT} text-secondary`,
    formFieldInput: `h-10 max-h-10 px-3 text-sm leading-[21px] text-foreground focus:shadow-[0_0_0_3px] focus:shadow-accent/20 focus:ring-accent aria-invalid:ring-danger aria-invalid:focus:shadow-danger/20 ${FIELD_RING}`,
    formFieldInputShowPasswordButton: `rounded-sm text-muted hover:bg-transparent hover:text-foreground ${QUICK_COLORS} ${FOCUS_OUTLINE}`,
    formFieldInputShowPasswordIcon: 'size-3.5',
    formFieldErrorText: 'text-xs leading-4 text-danger',
    formFieldSuccessText: 'text-xs leading-4 text-secondary',
    formFieldInfoText: 'text-xs leading-4 text-secondary',
    formFieldWarningText: 'text-xs leading-4 text-secondary',

    // Important: the rule of `form` above is the stronger one, and the message under the boxes sits closer.
    otpCodeField: 'self-start gap-0!',
    otpCodeFieldInputs: 'justify-start gap-2',
    otpCodeFieldInput:
      'size-11 max-h-11 rounded bg-background font-mono text-lg text-foreground shadow-none ring-1 ring-border-strong ring-inset aria-invalid:ring-danger data-[focus-within=true]:ring-accent aria-invalid:data-[focus-within=true]:ring-danger',
    otpCodeFieldErrorText: 'left-0 text-xs leading-4 text-danger',
    formResendCodeLink: `self-start ${QUIET_LINK}`,

    alert: 'rounded border-0 bg-danger/10 px-3 py-2 shadow-none ring-1 ring-danger-border ring-inset',
    alertText: `${SMALL_TEXT} text-foreground`,

    // `after:` is Clerk's sheen over its buttons. Ours are one flat color.
    formButtonPrimary: `h-10 w-full rounded bg-accent px-4 text-background shadow-none after:hidden hover:bg-accent/90 ${QUICK_COLORS} ${FOCUS_OUTLINE} ${BUTTON_TEXT}`,
    buttonArrowIcon: 'hidden',
    alternativeMethodsBlockButton: `h-10 max-h-10 rounded after:hidden ${BUTTON_TEXT} ${FOCUS_OUTLINE}`,
    alternativeMethodsBlockButtonText: BUTTON_TEXT,
  },
};

/** The words of those forms, where ours differ from Clerk's. */
export const humanClerkLocalization: ClerkProviderProps['localization'] = {
  socialButtonsBlockButton: 'Continue with {{provider|titleize}}',
  socialButtonsBlockButtonManyInView: 'Continue with {{provider|titleize}}',
  dividerText: 'or',
  formFieldLabel__emailAddress: 'Email',
  formFieldInputPlaceholder__emailAddress: '',
  formFieldInputPlaceholder__firstName: '',
  formFieldInputPlaceholder__lastName: '',
  formFieldInputPlaceholder__password: '',
  formFieldInputPlaceholder__signUpPassword: '',
  formFieldAction__forgotPassword: 'Forgot?',
  signIn: {
    start: {
      title: 'Sign in',
      subtitle: 'Sign in to your Agent Inbox account.',
      actionText: 'New here?',
      actionLink: 'Create an account',
    },
  },
  signUp: {
    start: {
      title: 'Create your account',
      subtitle: 'Free. No card. Takes a few seconds.',
      actionText: 'Have an account?',
      actionLink: 'Sign in',
    },
    // The title Clerk switches to for a moment after the terms are accepted, so it has to be the same one.
    continue: {
      title: 'One last step',
      subtitle: 'Fill in the rest to finish creating your account.',
    },
    legalConsent: {
      continue: {
        title: 'One last step',
        subtitle: 'Agree to the terms to finish creating your account.',
      },
    },
  },
};
