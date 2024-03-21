import { createStyles, Group, Skeleton, Stack } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Frame from 'react-frame-component';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import { IFormStep } from '../../../../pages/templates/components/formTypes';
import { EmailIntegrationInfo } from '../../../../pages/templates/editor/EmailIntegrationInfo';
import { When } from '../../../utils/When';
import { LocaleSelect } from '../common/LocaleSelect';
import { EmailMobile } from '../common/EmailMobile';
import { PreviewEditOverlay } from '../common/PreviewEditOverlay';
import { PreviewUserIcon } from '../common/PreviewUserIcon';
import { ContentSkeleton, HeaderSkeleton } from './Skeleton';

const useStyles = createStyles((theme, { error }: { error: boolean }) => ({
  header: {
    width: '100%',
    marginTop: '20px',
    paddingLeft: '15px',
    paddingRight: '15px',
  },
  subject: {
    marginBottom: '3px',
    fontWeight: 'bolder',
  },
  from: {
    color: theme.colorScheme === 'dark' ? colors.B60 : colors.B70,
    fontWeight: 'normal',
  },
  line: {
    height: '2px',
    width: '340px',
    marginLeft: '15px',
    marginRight: '15px',
    background: theme.colorScheme === 'dark' ? colors.B20 : colors.B85,
    marginTop: '19px',
  },
  frame: {
    border: '0px',
    width: '100%',
    height: '609px',
    borderRadius: '0 0 30px 30px',
  },
  fallbackFrame: {
    border: '0px',
    width: '100%',
    height: '609px',
    borderRadius: '0 0 30px 30px',
    padding: '15px',
    textAlign: 'center',
  },
  content: {
    position: 'relative',
    border: error ? `1px solid ${colors.error}` : 'none',
  },
}));

export const PreviewMobile = ({
  integration,
  subject,
  content,
  loading = false,
  error,
  showEditOverlay = false,
  onLocaleChange,
  selectedLocale,
  locales,
  chimera = false,
}: {
  integration: any;
  subject?: string;
  content: string;
  loading?: boolean;
  error?: Merge<FieldError, FieldErrorsImpl<IFormStep>>;
  showEditOverlay?: boolean;
  onLocaleChange: (locale: string) => void;
  selectedLocale?: string;
  locales: any[];
  chimera?: boolean;
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
      <EmailMobile>
        <div className={classes.header}>
          <Group
            sx={{
              height: '40px',
            }}
            spacing={0}
            position="apart"
          >
            <div>
              <Group
                sx={{
                  height: '40px',
                }}
                spacing={13}
                noWrap
              >
                <When truthy={loading}>
                  <HeaderSkeleton />
                </When>

                <When truthy={!loading}>
                  <PreviewUserIcon />
                  <div>
                    {!chimera && error && error.template?.subject && error.template?.subject?.message ? (
                      <Text color={colors.error}>{error.template.subject.message}</Text>
                    ) : (
                      <>
                        <div data-test-id="preview-subject" className={classes.subject}>
                          {subject}
                        </div>
                        <Group spacing={13} position="apart">
                          <div data-test-id="preview-from" className={classes.from}>
                            <EmailIntegrationInfo integration={integration} field={'from'} />
                          </div>
                        </Group>
                      </>
                    )}
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <LocaleSelect
                      isLoading={loading}
                      locales={locales}
                      value={selectedLocale}
                      onLocaleChange={onLocaleChange}
                    />
                  </div>
                </When>
              </Group>
            </div>
          </Group>
        </div>
        <div className={classes.line}></div>
        <div className={classes.content} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <When truthy={loading}>
            <ContentSkeleton />
          </When>
          <When truthy={!loading}>
            {isEditOverlayVisible && <PreviewEditOverlay />}
            <ErrorBoundary
              FallbackComponent={() => (
                <div data-test-id="preview-content" className={classes.fallbackFrame}>
                  Oops! We've recognized some glitch in this HTML. Please give it another look!
                </div>
              )}
              resetKeys={[content]}
            >
              <Frame data-test-id="preview-content" className={classes.frame} initialContent={content}>
                <></>
              </Frame>
            </ErrorBoundary>
            {error && error.template?.content && error.template?.content?.message && (
              <Text color={colors.error}>{error?.template?.content?.message}</Text>
            )}
          </When>
        </div>
      </EmailMobile>
    </>
  );
};
