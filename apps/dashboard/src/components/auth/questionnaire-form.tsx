import { Button } from '@/components/primitives/button';
import { CardDescription, CardTitle } from '@/components/primitives/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { useOrganization, useUser } from '@clerk/clerk-react';
import { CompanySizeEnum, JobTitleEnum, jobTitleToLabelMapper, OrganizationTypeEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { updateClerkOrgMetadata } from '../../api/organization';
import { identifyUser } from '../../api/telemetry';
import { useAuth } from '../../context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '../../context/environment/hooks';
import { useSegment } from '../../context/segment';
import { useTelemetry } from '../../hooks/use-telemetry';
import { hubspotCookie } from '../../utils/cookies';
import { ROUTES } from '../../utils/routes';
import { TelemetryEvent } from '../../utils/telemetry';
import { StepIndicator } from './shared';

interface QuestionnaireFormData {
  jobTitle: JobTitleEnum;
  organizationType: OrganizationTypeEnum;
  companySize?: CompanySizeEnum;
}

interface SubmitQuestionnaireData {
  jobTitle: JobTitleEnum;
  organizationType: OrganizationTypeEnum;
  companySize?: CompanySizeEnum;
  pageUri: string;
  pageName: string;
  hubspotContext: string;
}

export function QuestionnaireForm() {
  const { organization } = useOrganization();
  useFetchEnvironments({ organizationId: organization?.id });

  const { control, watch, handleSubmit } = useForm<QuestionnaireFormData>();
  const submitQuestionnaireMutation = useSubmitQuestionnaire();
  const { user } = useUser();
  const selectedJobTitle = watch('jobTitle');
  const selectedOrgType = watch('organizationType');
  const companySize = watch('companySize');

  const shouldShowCompanySize =
    (selectedOrgType === OrganizationTypeEnum.COMPANY || selectedOrgType === OrganizationTypeEnum.AGENCY) &&
    !!selectedJobTitle;

  const isFormValid = React.useMemo(() => {
    if (!selectedJobTitle || !selectedOrgType) return false;
    if (shouldShowCompanySize && !companySize) return false;

    return true;
  }, [selectedJobTitle, selectedOrgType, shouldShowCompanySize, companySize]);

  const onSubmit = async (data: QuestionnaireFormData) => {
    const hubspotContext = hubspotCookie.get();

    submitQuestionnaireMutation.mutate({
      ...data,
      pageUri: window.location.href,
      pageName: 'Create Organization Form',
      hubspotContext: hubspotContext || '',
    });

    if (!user?.unsafeMetadata?.newDashboardOptInStatus) {
      await user?.update({
        unsafeMetadata: {
          newDashboardOptInStatus: 'opted_in',
        },
      });
      await user?.reload();
    }
  };

  return (
    <>
      <div className="w-full max-w-[564px] px-0 pt-[80px]">
        <div className="flex flex-col items-center gap-8">
          <div className="flex w-[350px] flex-col gap-1">
            <div className="flex w-full items-center gap-1.5">
              <div className="flex flex-1 flex-col gap-1">
                <StepIndicator step={2} />
                <CardTitle className="text-foreground-900 text-lg font-medium">
                  Help us personalize your experience
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-foreground-400 text-xs">
              This helps us set up Novu to match your goals and plan features and improvements.
            </CardDescription>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex w-[350px] flex-col gap-8">
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-[4px]">
                <label className="text-foreground-600 text-xs font-medium">Job title</label>
                <Controller
                  name="jobTitle"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={`shadow-regular-shadow-x-small h-[32px] w-full border border-[#E1E4EA] ${field.value ? 'text-[#0E121B]' : 'text-[#99A0AE]'}`}
                      >
                        <SelectValue placeholder="What's your nature of work" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(jobTitleToLabelMapper).map(([value, label], index) => (
                          <SelectItem key={index} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <AnimatePresence mode="sync">
                {selectedJobTitle && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex flex-col gap-[4px]"
                  >
                    <label className="text-xs font-medium text-[#525866]">Organization type</label>
                    <div className="flex flex-wrap gap-[8px]">
                      <Controller
                        name="organizationType"
                        control={control}
                        render={({ field }) => (
                          <>
                            {Object.values(OrganizationTypeEnum).map((type, index) => (
                              <Button
                                variant="secondary"
                                key={index}
                                mode="outline"
                                size="xs"
                                type="button"
                                className={`h-[28px] rounded-full px-3 py-1 text-sm ${
                                  field.value === type ? 'border-[#E1E4EA] bg-[#F2F5F8]' : 'border-[#E1E4EA]'
                                }`}
                                onClick={() => field.onChange(type)}
                              >
                                {type}
                              </Button>
                            ))}
                          </>
                        )}
                      />
                    </div>
                  </motion.div>
                )}

                {shouldShowCompanySize && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex flex-col gap-[4px]"
                  >
                    <label className="text-xs font-medium text-[#525866]">Company size</label>
                    <div className="flex flex-wrap gap-[8px]">
                      <Controller
                        name="companySize"
                        control={control}
                        render={({ field }) => (
                          <>
                            {Object.values(CompanySizeEnum).map((size, index) => (
                              <Button
                                variant="secondary"
                                key={index}
                                mode="outline"
                                size="xs"
                                type="button"
                                className={`h-[28px] rounded-full px-3 py-1 text-sm ${
                                  field.value === size ? 'border-[#E1E4EA] bg-[#F2F5F8]' : 'border-[#E1E4EA]'
                                }`}
                                onClick={() => field.onChange(size)}
                              >
                                {size}
                              </Button>
                            ))}
                          </>
                        )}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {isFormValid && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex flex-col gap-3"
                >
                  <Button
                    type="submit"
                    isLoading={submitQuestionnaireMutation.isPending}
                    disabled={submitQuestionnaireMutation.isPending}
                  >
                    Continue
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>

      <div className="w-full max-w-[564px] flex-1">
        <img src="/images/auth/ui-org.svg" alt="create-org-illustration" />
      </div>
    </>
  );
}

function useSubmitQuestionnaire() {
  const { currentOrganization } = useAuth();
  const segment = useSegment();
  const track = useTelemetry();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: async (data: SubmitQuestionnaireData) => {
      await updateClerkOrgMetadata({
        environment: currentEnvironment!,
        data: {
          companySize: data.companySize,
          jobTitle: data.jobTitle,
          organizationType: data.organizationType,
        },
      });

      const anonymousId = await segment.getAnonymousId();

      await identifyUser({
        pageUri: data.pageUri,
        pageName: data.pageName,
        hubspotContext: data.hubspotContext,
        jobTitle: data.jobTitle,
        companySize: data.companySize,
        organizationType: data.organizationType,
        anonymousId,
      });

      if (currentOrganization) {
        segment.group(
          {
            id: currentOrganization?._id,
            name: currentOrganization?.name,
            createdAt: currentOrganization?.createdAt,
          },
          {
            organizationType: data.organizationType,
            companySize: data.companySize,
          }
        );
      }

      track(TelemetryEvent.CREATE_ORGANIZATION_FORM_SUBMITTED, {
        location: 'web',
        jobTitle: data.jobTitle,
        companySize: data.companySize,
        organizationType: data.organizationType,
      });
    },
    onSuccess: () => {
      navigate(ROUTES.USECASE_SELECT);
    },
  });
}
