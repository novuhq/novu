import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { HelpTooltipIndicator } from '@/components/primitives/help-tooltip-indicator';
import { Switch } from '@/components/primitives/switch';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';

const fieldKey = 'disableOutputSanitization';

export const BypassSanitizationSwitch = () => {
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();

  return (
    <div className="flex items-center gap-1">
      <FormField
        control={control}
        name={fieldKey}
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-2">
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={(e) => {
                  field.onChange(e);
                  saveForm();
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormLabel className="text-foreground-600 text-xs">Disable content sanitization</FormLabel>
      <HelpTooltipIndicator
        size="4"
        text={
          <>
            <p>
              By default, Novu sanitizes subject and body to ensure it is safe to render in In-app and email
              notifications.
            </p>
            <br />
            <p>
              The sanitization applies to suspicious HTML tags such as <script /> and entities such as &amp;, &lt;,
              &gt;.
            </p>
            <br />
            <p>
              Disabling content sanitization should be used with trusted trigger payload so as not to expose your app to
              security risks such as XSS attacks.
            </p>
          </>
        }
      />
    </div>
  );
};
