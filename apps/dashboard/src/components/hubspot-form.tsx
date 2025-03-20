import { useEffect, useRef } from 'react';
import styles from './hubspot-form.module.css';

declare global {
  interface Window {
    hbspt?: {
      forms: {
        create: (config: any) => void;
      };
    };
  }
}

interface HubspotFormProps {
  formId: string;
  properties?: Record<string, string>;
  readonlyProperties?: string[];
  focussedProperty?: string;
  onFormSubmitted?: () => void;
}

const HUBSPOT_FORM_CLASS = 'hubspot-form-wrapper';

export function HubspotForm({ formId, properties = {}, readonlyProperties = [], onFormSubmitted }: HubspotFormProps) {
  const formContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//js.hsforms.net/forms/embed/v2.js';
    script.async = true;

    script.onload = () => {
      if (window.hbspt && formContainerRef.current) {
        window.hbspt.forms.create({
          region: 'na1',
          portalId: '44416662',
          formId,
          target: `#${formContainerRef.current.id}`,
          onFormSubmitted,
          cssClass: HUBSPOT_FORM_CLASS,
          inlineMessage: 'Thank you for your submission.',
          fieldLabels: Object.entries(properties).reduce(
            (acc, [key, value]) => {
              if (readonlyProperties.includes(key)) {
                acc[key] = { value, hidden: true };
              }

              return acc;
            },
            {} as Record<string, { value: string; hidden: boolean }>
          ),
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [formId, properties, readonlyProperties, onFormSubmitted]);

  return (
    <div className={styles.container}>
      <div ref={formContainerRef} id={`hubspot-form-${formId}`} />
    </div>
  );
}
