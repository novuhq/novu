import { DEFAULT_LOCALE, EnvironmentTypeEnum, PermissionsEnum } from '@novu/shared';
import { forwardRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiSettings4Line } from 'react-icons/ri';
import { Form, FormControl, FormField, FormItem, FormLabel, FormRoot } from '@/components/primitives/form/form';
import { InlineToast } from '@/components/primitives/inline-toast';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetTitle } from '@/components/primitives/sheet';
import { Skeleton } from '@/components/primitives/skeleton';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useCombinedRefs } from '@/hooks/use-combined-refs';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useUpdateOrganizationSettings } from '@/hooks/use-update-organization-settings';
import { PermissionButton } from '../primitives/permission-button';

interface TranslationSettingsFormData {
  defaultLocale: string;
  targetLocales: string[];
}

interface TranslationSettingsDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const TranslationSettingsDrawer = forwardRef<HTMLDivElement, TranslationSettingsDrawerProps>(
  ({ isOpen, onOpenChange }, forwardedRef) => {
    const has = useHasPermission();
    const { currentEnvironment } = useEnvironment();
    const canWrite = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
    const isDevEnvironment = currentEnvironment?.type === EnvironmentTypeEnum.DEV;
    const isReadOnly = !canWrite || !isDevEnvironment;

    const { data: organizationSettings, isLoading, refetch } = useFetchOrganizationSettings();
    const updateSettings = useUpdateOrganizationSettings();

    const {
      protectedOnValueChange,
      ProtectionAlert,
      ref: protectionRef,
    } = useFormProtection({
      onValueChange: onOpenChange,
    });

    const combinedRef = useCombinedRefs(forwardedRef, protectionRef);

    const form = useForm<TranslationSettingsFormData>({
      defaultValues: {
        defaultLocale: DEFAULT_LOCALE,
        targetLocales: [],
      },
    });

    const { reset } = form;

    // Update form when settings load
    useEffect(() => {
      if (organizationSettings?.data) {
        reset({
          defaultLocale: organizationSettings.data.defaultLocale || DEFAULT_LOCALE,
          targetLocales: organizationSettings.data.targetLocales || [],
        });
      }
    }, [organizationSettings?.data, reset]);

    const handleSave = useCallback(async () => {
      const formValues = form.getValues();

      if (isReadOnly) return;

      try {
        await updateSettings.mutateAsync({
          defaultLocale: formValues.defaultLocale,
          targetLocales: formValues.targetLocales,
        });

        showSuccessToast('Translation settings updated successfully');
        refetch();
        onOpenChange(false);
      } catch (error) {
        // Error handling is already handled by the mutation
      }
    }, [form, updateSettings, isReadOnly, refetch, onOpenChange]);

    return (
      <>
        <Sheet open={isOpen} onOpenChange={protectedOnValueChange}>
          <SheetContent ref={combinedRef} side="right" className="w-[500px] !max-w-none">
            <div className="flex h-full flex-col">
              <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b px-3 py-4">
                <div className="flex flex-1 items-center gap-2 overflow-hidden text-sm font-medium">
                  <RiSettings4Line className="h-4 w-4 text-neutral-600" />
                  <SheetTitle className="flex-1 truncate pr-10 text-sm font-medium text-neutral-950">
                    Configure translation settings
                  </SheetTitle>
                </div>
              </header>

              <div className="flex-1 overflow-auto p-3.5">
                {!isDevEnvironment && (
                  <div className="mb-6">
                    <InlineToast
                      variant="warning"
                      title="View-only mode"
                      description="Edit translation settings in your development environment."
                    />
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    {isLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : (
                      <Form {...form}>
                        <FormRoot className="space-y-6">
                          <FormField
                            control={form.control}
                            name="defaultLocale"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel
                                  className="text-text-sub gap-1"
                                  tooltip="The primary language for your translations - serves as fallback when language specific translations are not available"
                                >
                                  Default language
                                </FormLabel>
                                <FormControl>
                                  <LocaleSelect
                                    value={field.value}
                                    onChange={field.onChange}
                                    className="w-full"
                                    disabled={isReadOnly}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="targetLocales"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel
                                  className="text-text-sub gap-1"
                                  tooltip="Languages you want to translate into. We'll check if they're in sync with your default language."
                                >
                                  Target languages
                                </FormLabel>
                                <FormControl>
                                  <LocaleSelect
                                    value={field.value}
                                    onChange={field.onChange}
                                    className="w-full"
                                    multiSelect={true}
                                    disabled={isReadOnly}
                                  />
                                </FormControl>
                                <span className="text-text-soft text-2xs">
                                  Select all languages you want to translate into
                                </span>
                              </FormItem>
                            )}
                          />
                        </FormRoot>
                      </Form>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <Separator />
                <div className="flex justify-end gap-3 p-3.5">
                  <PermissionButton
                    permission={PermissionsEnum.WORKFLOW_WRITE}
                    variant="secondary"
                    onClick={handleSave}
                    disabled={updateSettings.isPending || isReadOnly}
                    isLoading={updateSettings.isPending}
                  >
                    Save changes
                  </PermissionButton>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {ProtectionAlert}
      </>
    );
  }
);
