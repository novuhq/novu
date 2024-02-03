import { createStyles, Group, Skeleton, Stack } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Frame from 'react-frame-component';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import { When } from '../../../utils/When';
import { IFormStep } from '../../../../pages/templates/components/formTypes';
import { EmailIntegrationInfo } from '../../../../pages/templates/editor/EmailIntegrationInfo';
import { LocaleSelect } from '../common/LocaleSelect';
import { PreviewEditOverlay } from '../common/PreviewEditOverlay';
import { PreviewUserIcon } from '../common/PreviewUserIcon';

const useStyles = createStyles((theme, { error }: { error: boolean }) => ({
  browser: {
    backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.B98,
    borderRadius: '8px',
    height: '95%',
    minHeight: '50vh',
  },
  bar: {
    borderRadius: '8px 8px 0 0',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.B85,
    width: '100%',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
  },
  barAction: {
    height: '8px',
    width: '8px',
    borderRadius: '50%',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
  },
  header: {
    width: '100%',
  },
  subject: {
    marginBottom: '3px',
    fontWeight: 'bolder',
  },
  from: {
    color: theme.colorScheme === 'dark' ? colors.B60 : colors.B40,
    fontWeight: 'normal',
  },
  content: {
    borderRadius: '8px',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.white,
    flex: 1,
    border: error ? `1px solid ${colors.error}` : 'none',
    position: 'relative',
  },
  contentContainer: {
    padding: '24px',
    paddingBottom: '32px',
    height: 'calc(100% - 28px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  frame: {
    border: '0px',
    width: '100%',
    height: '100%',
    borderRadius: '8px',
  },
  fallbackFrame: {
    border: '0px',
    width: '100%',
    height: '100%',
    padding: '15px',
    textAlign: 'center',
  },
}));

export const PreviewWeb = ({
  integration,
  subject,
  content,
  loading = false,
  error,
  showEditOverlay = false,
  setSelectedLocale,
  selectedLocale,
  locales,
}: {
  integration: any;
  subject?: string;
  content: string;
  loading?: boolean;
  error?: Merge<FieldError, FieldErrorsImpl<IFormStep>>;
  showEditOverlay?: boolean;
  setSelectedLocale: (locale: string) => void;
  selectedLocale?: string;
  locales: any[];
}) => {
  const { classes } = useStyles({ error: !!(error && error.template?.content && error.template?.content?.message) });

  const [isEditOverlayVisible, setIsEditOverlayVisible] = useState(false);

  const handleMouseEnter = () => {
    if (showEditOverlay) {
      setIsEditOverlayVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (showEditOverlay && isEditOverlayVisible) {
      setIsEditOverlayVisible(false);
    }
  };

  return (
    <>
      <div className={classes.browser}>
        <div className={classes.bar}>
          <Group spacing={6}>
            <div className={classes.barAction}></div>
            <div className={classes.barAction}></div>
            <div className={classes.barAction}></div>
          </Group>
        </div>
        <div className={classes.contentContainer}>
          <div className={classes.header}>
            <Group
              sx={{
                height: '40px',
              }}
              spacing={16}
              noWrap
            >
              <When truthy={loading}>
                <Skeleton height={40} width={40} circle />
                <Stack spacing={3}>
                  <Skeleton height={14} width={160} radius="xs" />
                  <Skeleton height={14} width={80} />
                </Stack>
              </When>
              <When truthy={!loading}>
                <PreviewUserIcon />
                <div>
                  {error && error.template?.subject && error.template?.subject?.message ? (
                    <Text color={colors.error}>{error.template.subject.message}</Text>
                  ) : (
                    <>
                      <div data-test-id="preview-subject" className={classes.subject}>
                        {subject}
                      </div>
                      <div data-test-id="preview-from" className={classes.from}>
                        <EmailIntegrationInfo integration={integration} field={'from'} />
                      </div>
                    </>
                  )}
                </div>

                <LocaleSelect
                  isLoading={loading}
                  locales={locales}
                  readonly={false}
                  value={selectedLocale}
                  setSelectedLocale={setSelectedLocale}
                />
              </When>
            </Group>
          </div>

          <div className={classes.content} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <When truthy={loading}>
              <Stack spacing={40} py={40} px={30} h="100%">
                <Group position="center" noWrap>
                  <Skeleton height={40} width={80} radius="sm" />
                </Group>
                <Stack spacing={12}>
                  <Group spacing={16} noWrap>
                    <Skeleton height={14} width={'70%'} radius="sm" />
                    <Skeleton height={14} width={'30%'} radius="sm" />
                  </Group>
                  <Group spacing={16} noWrap>
                    <Skeleton height={14} width={'30%'} radius="sm" />
                    <Skeleton height={14} width={'70%'} radius="sm" />
                  </Group>
                  <Group spacing={16} noWrap>
                    <Skeleton height={14} width={'72%'} radius="sm" />
                  </Group>
                </Stack>

                <Group spacing={16} mt="auto" noWrap>
                  <Skeleton height={14} width={'30%'} radius="sm" />
                </Group>
              </Stack>
            </When>
            <When truthy={!loading}>
              {isEditOverlayVisible && <PreviewEditOverlay />}

              <ErrorBoundary
                FallbackComponent={() => (
                  <div data-test-id="preview-content" className={classes.fallbackFrame}>
                    <Text color={colors.error}>
                      Oops! We've recognized some glitch in this HTML. Please give it another look!
                    </Text>
                  </div>
                )}
                resetKeys={[content]}
              >
                <Frame className={classes.frame} data-test-id="preview-content" initialContent={content}>
                  <></>
                </Frame>
              </ErrorBoundary>

              {error && error.template?.content && error.template?.content?.message && (
                <Text color={colors.error}>{error?.template?.content?.message}</Text>
              )}
            </When>
          </div>
        </div>
      </div>
    </>
  );
};
