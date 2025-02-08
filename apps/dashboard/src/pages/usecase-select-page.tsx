import { channelOptions } from '@/components/auth/usecases-list.utils';
import { AnimatedPage } from '@/components/onboarding/animated-page';
import { useEnvironment } from '@/context/environment/hooks';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { useOrganization } from '@clerk/clerk-react';
import { ChannelTypeEnum } from '@novu/shared';
import * as Sentry from '@sentry/react';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { updateClerkOrgMetadata } from '../api/organization';
import { AuthCard } from '../components/auth/auth-card';
import { UsecaseSelectOnboarding } from '../components/auth/usecase-selector';
import { OnboardingArrowLeft } from '../components/icons/onboarding-arrow-left';
import { PageMeta } from '../components/page-meta';
import { Button } from '../components/primitives/button';
import { LinkButton } from '../components/primitives/button-link';
import { ROUTES } from '../utils/routes';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function UsecaseSelectPage() {
  const { organization } = useOrganization();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const track = useTelemetry();
  const [selectedUseCases, setSelectedUseCases] = useState<ChannelTypeEnum[]>([]);
  const [hoveredUseCase, setHoveredUseCase] = useState<ChannelTypeEnum | null>(null);

  useEffect(() => {
    track(TelemetryEvent.USECASE_SELECT_PAGE_VIEWED);
  }, [track]);

  useEffect(() => {
    if (organization?.publicMetadata?.useCases) {
      setSelectedUseCases(organization.publicMetadata.useCases as ChannelTypeEnum[]);
    }
  }, [organization]);

  const displayedUseCase =
    hoveredUseCase || (selectedUseCases.length > 0 ? selectedUseCases[selectedUseCases.length - 1] : null);

  const { mutate: handleContinue, isPending } = useMutation({
    mutationFn: async () => {
      await updateClerkOrgMetadata({
        environment: currentEnvironment!,
        data: {
          useCases: selectedUseCases,
        },
      });
      await organization?.reload();
    },
    onSuccess: () => {
      track(TelemetryEvent.USE_CASE_SELECTED, {
        useCases: selectedUseCases,
      });

      if (selectedUseCases.includes(ChannelTypeEnum.IN_APP)) {
        navigate(ROUTES.INBOX_USECASE);
      } else {
        navigate(ROUTES.WELCOME);
      }
    },
    onError: (error) => {
      console.error('Failed to update use cases:', error);
      Sentry.captureException(error);
    },
  });

  function handleSkip() {
    track(TelemetryEvent.USE_CASE_SKIPPED);

    navigate(ROUTES.INBOX_USECASE);
  }

  function handleSelectUseCase(useCase: ChannelTypeEnum) {
    setSelectedUseCases((prev) =>
      prev.includes(useCase) ? prev.filter((item) => item !== useCase) : [...prev, useCase]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (selectedUseCases.length === 0 || isPending) return;

    handleContinue();
  }

  return (
    <>
      <Helmet>
        {channelOptions.map((option) => (
          <link key={option.id} rel="prefetch" href={`/images/auth/${option.image}`} as="image" />
        ))}
      </Helmet>
      <PageMeta title="Customize you experience" />
      <motion.div
        initial="hidden"
        animate="visible"
        className="flex h-full w-full items-center justify-center"
        variants={containerVariants}
      >
        <AnimatedPage className="flex w-full justify-center">
          <AuthCard className="flex h-full min-h-[600px]">
            <motion.div className="flex w-[480px] justify-center px-0" variants={itemVariants}>
              <form onSubmit={handleSubmit} noValidate>
                <div className="flex max-w-[480px] flex-col items-center justify-center gap-8 p-[60px]">
                  <UsecaseSelectOnboarding
                    channelOptions={channelOptions}
                    selectedUseCases={selectedUseCases}
                    onHover={(id) => setHoveredUseCase(id)}
                    onClick={(id) => handleSelectUseCase(id)}
                  />

                  <motion.div className="flex w-full flex-col items-center gap-3" variants={itemVariants}>
                    <Button
                      variant="secondary"
                      mode="filled"
                      disabled={selectedUseCases.length === 0}
                      isLoading={isPending}
                      className="w-full"
                      type="submit"
                    >
                      Continue
                    </Button>
                    <LinkButton size="sm" type="button" variant="gray" className="pt-0" onClick={handleSkip}>
                      Skip this step
                    </LinkButton>
                  </motion.div>
                </div>
              </form>
            </motion.div>

            <motion.div
              className="flex min-h-[600px] w-full max-w-[640px] flex-1 items-center justify-center border-l border-l-neutral-200 bg-white px-10"
              variants={itemVariants}
            >
              <AnimatePresence mode="wait">
                {displayedUseCase && (
                  <motion.img
                    key={displayedUseCase}
                    src={`/images/auth/${channelOptions.find((option) => option.id === displayedUseCase)?.image}`}
                    alt={`${displayedUseCase}-usecase-illustration`}
                    className="h-auto max-h-[500px] w-full object-contain"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                )}

                {!displayedUseCase && <EmptyStateView />}
              </AnimatePresence>
            </motion.div>
          </AuthCard>
        </AnimatedPage>
      </motion.div>
    </>
  );
}

function EmptyStateView() {
  return (
    <motion.div
      className="relative w-full p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <motion.div
        className="absolute left-2 top-[175px]"
        animate={{
          x: [0, 5, 0],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        <OnboardingArrowLeft className="text-success h-[25px] w-[65px]" />
      </motion.div>

      <motion.p
        className="text-success absolute left-10 top-[211px] text-xs italic"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        Hover on the cards to visualize, <br />
        select all that apply.
      </motion.p>

      <motion.p
        className="absolute bottom-4 left-3.5 w-[400px] text-xs italic text-neutral-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        This helps us understand your use-case better with the channels you'd use in your product to communicate with
        your users.
        <br />
        <br />
        don't worry, you can always change later as you build.
      </motion.p>
    </motion.div>
  );
}
