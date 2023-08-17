import { Center, createStyles, Group, Loader } from '@mantine/core';
import { format } from 'date-fns';
import Frame from 'react-frame-component';
import { colors } from '../../../design-system';
import { PreviewDateIcon } from './PreviewDateIcon';
import { PreviewUserIcon } from './PreviewUserIcon';
import { ErrorBoundary } from 'react-error-boundary';
import { Mobile } from './Mobile';
import { When } from '../../../components/utils/When';
import { EmailIntegrationInfo } from './EmailIntegrationInfo';

const useStyles = createStyles((theme) => ({
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
  date: {
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
}));

export const PreviewMobile = ({
  integration,
  subject,
  content,
  loading = false,
}: {
  integration: any;
  subject: string;
  content: string;
  loading?: boolean;
}) => {
  const { classes } = useStyles();

  return (
    <>
      <Mobile>
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
              >
                <PreviewUserIcon />
                <div>
                  <div data-test-id="preview-subject" className={classes.subject}>
                    {subject}
                  </div>
                  <Group spacing={13} position="apart">
                    <div data-test-id="preview-from" className={classes.from}>
                      <EmailIntegrationInfo integration={integration} field={'from'} />
                    </div>
                    <div className={classes.date}>
                      <PreviewDateIcon />
                      <span
                        style={{
                          marginLeft: '4px',
                        }}
                        data-test-id="preview-date"
                      >
                        {format(new Date(), 'EEE, MMM d, HH:mm')}
                      </span>
                    </div>
                  </Group>
                </div>
              </Group>
            </div>
          </Group>
        </div>
        <div className={classes.line}></div>
        <When truthy={loading}>
          <div>
            <Center>
              <Loader color={colors.B70} mb={20} mt={20} size={32} />
            </Center>
          </div>
        </When>
        <When truthy={!loading}>
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
        </When>
      </Mobile>
    </>
  );
};
