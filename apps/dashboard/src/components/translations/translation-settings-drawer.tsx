import { forwardRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/primitives/form/form';
import { Switch } from '@/components/primitives/switch';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { RiSettings4Line } from 'react-icons/ri';
import TruncatedText from '@/components/truncated-text';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useUpdateOrganizationSettings } from '@/hooks/use-update-organization-settings';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
import { cn } from '@/utils/ui';
import { DEFAULT_LOCALE } from '@novu/shared';

interface TranslationSettingsFormData {
  translationsEnabled: boolean;
  defaultLocale: string;
}

interface TranslationSettingsDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const TranslationSettingsDrawer = forwardRef<HTMLDivElement, TranslationSettingsDrawerProps>(
  ({ isOpen, onOpenChange }, forwardedRef) => {
    const { data: organizationSettings, isLoading } = useFetchOrganizationSettings();
    const updateSettings = useUpdateOrganizationSettings();
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

    const form = useForm<TranslationSettingsFormData>({
      defaultValues: {
        translationsEnabled: false,
        defaultLocale: DEFAULT_LOCALE,
      },
    });

    const translationsEnabled = form.watch('translationsEnabled');

    // Update form when organization settings are loaded
    useEffect(() => {
      if (organizationSettings?.data) {
        form.reset({
          translationsEnabled: organizationSettings.data.translationsEnabled,
          defaultLocale: organizationSettings.data.defaultLocale,
        });
      }
    }, [organizationSettings, form]);

    // Check if form has unsaved changes
    const formValues = form.watch();
    const hasUnsavedChanges = useMemo(() => {
      if (!organizationSettings?.data) return false;

      return (
        formValues.translationsEnabled !== organizationSettings.data.translationsEnabled ||
        formValues.defaultLocale !== organizationSettings.data.defaultLocale
      );
    }, [formValues, organizationSettings?.data]);

    const handleSave = () => {
      const values = form.getValues();
      updateSettings.mutate(
        {
          translationsEnabled: values.translationsEnabled,
          defaultLocale: values.defaultLocale,
        },
        {
          onSuccess: () => {
            showSuccessToast('Translation settings updated successfully');
          },
        }
      );
    };

    const handleCloseAttempt = useCallback(
      (event?: Event | KeyboardEvent) => {
        event?.preventDefault();

        if (hasUnsavedChanges) {
          setShowUnsavedDialog(true);
        } else {
          onOpenChange(false);
        }
      },
      [hasUnsavedChanges, onOpenChange]
    );

    const handleConfirmClose = useCallback(() => {
      setShowUnsavedDialog(false);
      onOpenChange(false);
    }, [onOpenChange]);

    return (
      <>
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
          <SheetContent
            ref={forwardedRef}
            className="w-[400px]"
            aria-describedby="translation-settings-description"
            onInteractOutside={handleCloseAttempt}
            onEscapeKeyDown={handleCloseAttempt}
          >
            <SheetTitle className="sr-only">Translation settings</SheetTitle>
            <SheetDescription id="translation-settings-description" className="sr-only">
              Configure translation settings for your organization
            </SheetDescription>

            <div className="flex h-full flex-col">
              <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b px-3 py-4">
                <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
                  <RiSettings4Line className="size-5 p-0.5" />
                  <TruncatedText className="flex-1">Translation settings</TruncatedText>
                </div>
              </header>

              <div className="flex flex-1 flex-col overflow-y-auto">
                <div className="p-6">
                  {isLoading ? (
                    <div className="space-y-6">
                      <div className="flex w-full items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-12" />
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </div>
                  ) : (
                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="translationsEnabled"
                        render={({ field }) => (
                          <FormItem className="mb-5 flex w-full items-center justify-between space-y-0">
                            <FormLabel
                              className="text-text-sub cursor-pointer gap-1"
                              tooltip="Enable translations for all workflows"
                            >
                              Enable translations
                            </FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="defaultLocale"
                        render={({ field }) => (
                          <FormItem className={cn('space-y-1', !translationsEnabled && 'cursor-not-allowed')}>
                            <FormLabel
                              className="text-text-sub gap-1"
                              tooltip="The fallback locale used when translations are not available for a user's preferred language"
                            >
                              Default locale
                            </FormLabel>
                            <FormControl>
                              {!translationsEnabled ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-not-allowed">
                                      <LocaleSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        disabled={!translationsEnabled}
                                        className="w-full"
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Enable translations first to select a default locale</TooltipContent>
                                </Tooltip>
                              ) : (
                                <LocaleSelect
                                  value={field.value}
                                  onChange={field.onChange}
                                  disabled={!translationsEnabled}
                                  className="w-full"
                                />
                              )}
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </Form>
                  )}
                </div>
                <Separator />
              </div>

              <div className="mt-auto">
                <Separator />
                <div className="flex justify-end gap-3 p-3.5">
                  <Button
                    variant="secondary"
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || updateSettings.isPending}
                    isLoading={updateSettings.isPending}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <UnsavedChangesAlertDialog
          show={showUnsavedDialog}
          description="You have unsaved changes to the workflow settings. These changes will be lost if you close the drawer."
          onCancel={() => setShowUnsavedDialog(false)}
          onProceed={handleConfirmClose}
        />
      </>
    );
  }
);
