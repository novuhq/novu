import { DEFAULT_LOCALE, PermissionsEnum } from '@novu/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiBookMarkedLine, RiRouteFill } from 'react-icons/ri';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { LinkButton } from '@/components/primitives/button-link';
import { Form, FormControl, FormField, FormItem } from '@/components/primitives/form/form';
import { InlineToast } from '@/components/primitives/inline-toast';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { TimelineContainer, TimelineStep } from '@/components/primitives/timeline';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useUpdateOrganizationSettings } from '@/hooks/use-update-organization-settings';
import { buildRoute, ROUTES } from '@/utils/routes';
import { EmptyTranslationsIllustration } from './empty-translations-illustration';

type TranslationOnboardingFormData = {
  defaultLocale: string;
  targetLocales: string[];
};

export const TranslationOnboardingPage = () => {
  const { environmentSlug } = useParams<{ environmentSlug: string }>();
  const { data: organizationSettings, isLoading } = useFetchOrganizationSettings();
  const updateOrganizationSettings = useUpdateOrganizationSettings();
  const has = useHasPermission();
  const canWrite = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
  const navigate = useNavigate();

  const form = useForm<TranslationOnboardingFormData>({
    defaultValues: {
      defaultLocale: organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE,
      targetLocales: organizationSettings?.data?.targetLocales || [DEFAULT_LOCALE],
    },
  });

  const handleDefaultLocaleChange = (value: string) => {
    form.setValue('defaultLocale', value);
    updateOrganizationSettings.mutate({
      defaultLocale: value,
    });
  };

  const handleTargetLocalesChange = (value: string[]) => {
    form.setValue('targetLocales', value);
    updateOrganizationSettings.mutate({
      targetLocales: value,
    });
  };

  // Update form when organization settings change (but not during mutations)
  useEffect(() => {
    if (organizationSettings?.data && !updateOrganizationSettings.isPending) {
      form.reset({
        defaultLocale: organizationSettings.data.defaultLocale,
        targetLocales: organizationSettings.data.targetLocales || [],
      });
    }
  }, [organizationSettings, form, updateOrganizationSettings.isPending]);

  const handleViewWorkflows = () => {
    if (environmentSlug) {
      navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-text-soft">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-full max-w-4xl flex-col items-start justify-center gap-6 p-6">
        {/* Header Section */}
        <EmptyTranslationsIllustration />
        <div className="flex flex-col gap-1">
          <h2 className="text-text-strong text-base font-medium">No translations yet — Let’s set things up</h2>
          <p className="text-text-soft text-xs font-medium">Start localizing your notifications in just a few steps.</p>
        </div>

        <div className="flex flex-col items-start">
          <Form {...form}>
            <TimelineContainer variant="centered">
              {/* Step 1: Set default language */}
              <TimelineStep
                index={0}
                title="Set your default language"
                description="This is your default language — the one your content is written in."
                layout="grid"
                rightContent={
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-text-sub text-xs font-medium">Default language</span>
                    </div>
                    <FormField
                      control={form.control}
                      name="defaultLocale"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <LocaleSelect
                              value={field.value}
                              onChange={handleDefaultLocaleChange}
                              className="w-full"
                              disabled={!canWrite}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                }
              />

              {/* Step 2: Add target languages */}
              <TimelineStep
                index={1}
                layout="grid"
                title="Add languages you want to support"
                description="Choose the languages you'd like to support. We'll provide a structure to manage them, but you’ll bring the translations."
                leftExtraContent={
                  <InlineToast
                    variant="tip"
                    title="Tip:"
                    description={
                      <>
                        Don't worry about getting this perfect — you can add more languages anytime.{' '}
                        <Link to="https://docs.novu.co/platform/workflow/translations" className="underline">
                          Learn more.
                        </Link>
                      </>
                    }
                  />
                }
                rightContent={
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-text-sub text-xs font-medium">Target languages</span>
                    </div>
                    <FormField
                      control={form.control}
                      name="targetLocales"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <LocaleSelect
                              value={field.value}
                              onChange={handleTargetLocalesChange}
                              className="w-full"
                              multiSelect
                              disabled={!canWrite}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                }
              />

              {/* Step 3: Enable translations */}
              <TimelineStep
                index={2}
                layout="grid"
                title="Enable translations where they matter"
                description="Head over to Workflows > Select a workflow > Enable Translations, — we’ll handle the right version for each subscriber."
                leftExtraContent={
                  <InlineToast
                    variant="tip"
                    title="How it works:"
                    description="You create content in your default language, export it, translate it externally, and re-upload the translated files here."
                  />
                }
                rightContent={
                  <div className="flex justify-center">
                    <img
                      src="/images/translations-onboarding.png"
                      alt="Translations onboarding"
                      className="h-auto w-full max-w-80 rounded-lg border border-neutral-200"
                    />
                  </div>
                }
              />
            </TimelineContainer>
          </Form>

          {/* Bottom buttons - Left aligned */}
          <div className="mt-6 flex flex-col items-start gap-3">
            <Button
              variant="primary"
              mode="gradient"
              type="submit"
              onClick={handleViewWorkflows}
              leadingIcon={RiRouteFill}
            >
              View workflows
            </Button>

            <Link to="https://docs.novu.co/platform/workflow/translations" target="_blank">
              <LinkButton variant="gray" leadingIcon={RiBookMarkedLine} size="sm">
                Learn more in docs
              </LinkButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
