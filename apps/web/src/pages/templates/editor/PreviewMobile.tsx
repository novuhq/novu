import { createStyles, Group } from '@mantine/core';
import { format } from 'date-fns';
import Frame from 'react-frame-component';
import { colors } from '../../../design-system';
import { PreviewDateIcon } from './PreviewDateIcon';
import { PreviewUserIcon } from './PreviewUserIcon';
import { ErrorBoundary } from 'react-error-boundary';

const useStyles = createStyles(() => ({
  phone: {
    display: 'block',
    margin: 'auto',
    width: '390px',
    height: '740px',
    position: 'relative',
    borderColor: colors.B20,
    borderWidth: '10px',
    borderStyle: 'solid',
    borderRadius: '40px',
  },
  cameraDent: {
    background: colors.B20,
    width: '148px',
    height: '30px',
    marginLeft: 'auto',
    marginRight: 'auto',
    borderRadius: '0 0 20px 20px',
  },
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
    color: colors.B60,
    fontWeight: 'normal',
  },
  date: {
    height: '20px',
    marginTop: '20px',
    color: colors.B60,
    fontWeight: 'normal',
  },
  line: {
    height: '2px',
    width: '340px',
    marginLeft: '15px',
    marginRight: '15px',
    background: colors.B20,
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
  },
  bottom: {
    height: '30px',
  },
}));

export const PreviewMobile = ({
  integration,
  subject,
  content,
}: {
  integration: any;
  subject: string;
  content: string;
}) => {
  const { classes } = useStyles();

  return (
    <>
      <div className={classes.phone}>
        <div className={classes.cameraDent}></div>
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
                spacing={15}
              >
                <PreviewUserIcon />
                <div>
                  <div className={classes.subject}>{subject}</div>
                  <div className={classes.from}>{integration?.credentials?.from || 'No active email integration'}</div>
                </div>
              </Group>
            </div>
            <div>
              <div className={classes.date}>
                <PreviewDateIcon />
                <span
                  style={{
                    marginLeft: '6px',
                  }}
                >
                  {format(new Date(), 'EEE, MMM d, HH:mm')}
                </span>
              </div>
            </div>
          </Group>
        </div>
        <div className={classes.line}></div>
        <ErrorBoundary
          FallbackComponent={() => <div className={classes.fallbackFrame}>test</div>}
          resetKeys={[content]}
        >
          <Frame className={classes.frame} initialContent={content}>
            <></>
          </Frame>
        </ErrorBoundary>
      </div>
      <div className={classes.bottom}></div>
    </>
  );
};
