import { useEffect } from 'react';
import styled from '@emotion/styled';
import { HUBSPOT_PORTAL_ID } from '../config';

// TODO: remove design system colors after fixing circular dependency from ee
const colors = {
  white: '#FFFFFF',
  black: '#000000',
  B80: '#BEBECC',
  B40: '#525266',
  B20: '#292933',
  vertical: `linear-gradient(0deg, #FF512F 0%, #DD2476 100%)`,
  horizontal: `linear-gradient(99deg, #DD2476 0% 0%, #FF512F 100% 100%)`,
};

declare global {
  interface Window {
    hbspt: any;
  }
}

/**
 * For the full list of available Hubspot Form options:
 *
 * @see https://developers.hubspot.com/docs/methods/forms/advanced_form_options
 */
export type HubspotFormProps<
  TProperties extends Record<string, string>,
  TKey extends keyof TProperties & string = keyof TProperties & string
> = {
  /**
   * The Hubspot form ID. This can be found in the Hubspot form embed snippet.
   */
  formId: string;
  /**
   * Properties for prepopulating fields. Keys must match the field names created in the Hubspot form.
   */
  properties?: TProperties;
  /**
   * Read-only properties for prepopulating fields. Keys must match the field names created in the Hubspot form.
   */
  readonlyProperties?: Array<TKey>;
  /**
   * The name of the property to focus when the form is ready.
   */
  focussedProperty?: TKey;
  /**
   * Callback function to be called when the form is submitted.
   */
  onFormSubmitted?: ($form?: any, values?: Record<string, unknown>) => void;
  /**
   * colorScheme
   */
  colorScheme: 'dark' | 'light';
};

const HUBSPOT_FORMS_URL = 'https://js.hsforms.net/forms/v2.js';
const HUBSPOT_REGION = 'na1';

const cssClass = 'hubspot-form-wrapper';
const StyledHubspotForm = styled.div<{ isDark: boolean }>`
  .${cssClass} {
    color: ${({ isDark }) => (isDark ? colors.B80 : colors.B40)};
    display: flex;
    flex-direction: column;
    gap: 16px;

    /** Column layout */
    .form-columns-1,
    .form-columns-2 {
      min-width: 100%;
      display: flex;
      gap: 20px;

      > * {
        width: 100%;
      }

      .hs-input {
        width: 100%;
      }
    }

    /** Hyperlinks */
    a {
      background-image: ${colors.horizontal};
      background-clip: text;
      -webkit-text-fill-color: transparent;
      text-decoration: none;
    }

    .input {
      input,
      textarea,
      select {
        &:focus-visible {
          outline: none;
          border-color: ${({ isDark }) => (isDark ? colors.white : colors.black)};
        }
      }
    }

    /** Form fields */
    .hs-input {
      appearance: none;
      background-color: transparent;
      border-radius: 7px;
      border: 1px solid ${({ isDark }) => (isDark ? colors.B20 : colors.B80)};
      box-sizing: border-box;
      display: block;
      font-family: Lato, sans serif;
      font-size: 14px;
      height: 42px;
      line-height: 40px;
      margin: 5px 0px; /* Adjusted margin */
      min-height: 50px;
      padding-left: 14px;
      padding-right: 14px;
      resize: none;
      text-align: left;
      transition: border-color 100ms ease;
      width: 100%;
    }

    /** Form text area */
    .hs-fieldtype-textarea {
      resize: vertical;
      min-height: 100px;
    }

    /** Form button */
    .hs-button {
      appearance: none;
      background-color: transparent;
      background-image: ${colors.horizontal};
      border-radius: 7px;
      border: 0;
      box-sizing: border-box;
      cursor: pointer;
      display: inline-block;
      font-family: Lato, sans serif;
      font-size: 14px;
      font-weight: 600;
      height: 42px;
      line-height: 1;
      padding-left: 22px;
      padding-right: 22px;
      position: relative;
      color: #fff;
      text-align: right;
      text-decoration: none;
      user-select: none;
      width: auto;
    }

    /** Form field label */
    .hs-form-field label {
      cursor: default;
      display: inline-block;
      font-size: 14px;
      font-weight: 700;
      line-height: 17px;
      margin: 5px 0px;
      word-break: break-word;
    }

    /** Form Submit action alignment */
    .hs-submit .actions {
      display: flex;
      justify-content: flex-end;
    }

    /** Legal consent container */
    .legal-consent-container {
      font-size: 12px;
      color: ${colors.B40};
      line-height: 16px;

      .p {
        margin-top: 0;
        margin-bottom: 0;
      }
    }
  }
`;

export const HubspotForm = <TProperties extends Record<string, string>>(props: HubspotFormProps<TProperties>) => {
  const elementId = `hubspotForm-${props.formId}`;

  const createForm = () => {
    if (window.hbspt) {
      window.hbspt.forms.create({
        target: `#${elementId}`,
        portalId: HUBSPOT_PORTAL_ID,
        region: HUBSPOT_REGION,
        cssClass,
        onFormReady: (form) => {
          if (props.focussedProperty) {
            const selector = CSS.escape(`${props.focussedProperty}-${props.formId}`);
            const input = form.querySelector(`#${selector}`) as HTMLInputElement;
            if (input) {
              input.focus();
            }
          }
          if (props.readonlyProperties) {
            props.readonlyProperties.forEach((property) => {
              const selector = CSS.escape(`${property}-${props.formId}`);
              const input = form.querySelector(`#${selector}`) as HTMLInputElement;
              if (input) {
                input.setAttribute('readonly', 'true');
              }
            });
          }
        },
        ...props,
      });
    }
  };

  useEffect(() => {
    if (!window.hbspt) {
      const script = document.createElement('script');
      script.src = HUBSPOT_FORMS_URL;
      document.body.appendChild(script);

      script.addEventListener('load', () => {
        createForm();
      });
    } else {
      createForm();
    }
  }, [props]);

  return (
    <StyledHubspotForm isDark={props.colorScheme === 'dark'}>
      <div id={elementId}></div>
    </StyledHubspotForm>
  );
};
