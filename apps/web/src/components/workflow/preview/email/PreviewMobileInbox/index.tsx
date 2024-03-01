import { createStyles, Group } from '@mantine/core';
import { format } from 'date-fns';
import { colors } from '@novu/design-system';
import { EmailIntegrationInfo } from '../../../../../pages/templates/editor/EmailIntegrationInfo';
import { EmailMobile } from '../../common/EmailMobile';
import { DateArrow } from './DateArrow';
import { ItemSkeleton } from './InboxItem';

const useStyles = createStyles((theme) => ({
  bottom: {
    height: '70px',
  },
  header: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: '15px',
    marginTop: '20px',
    marginBottom: '28px',
  },
  InboxItem: {
    marginBottom: '5px',
    fontSize: '14px',
    fontWeight: 'bolder',
  },
  preheader: {
    fontSize: '12px',
    color: theme.colorScheme === 'dark' ? colors.B60 : colors.B70,
  },
  subject: {
    marginBottom: '5px',
    fontSize: '12px',
    fontWeight: 'bolder',
  },
  content: {
    marginLeft: '15px',
    marginRight: '15px',
  },
  date: {
    marginRight: '7px',
    color: theme.colorScheme === 'dark' ? colors.B60 : colors.B70,
  },
}));

export const PreviewMobileInbox = ({
  integration,
  subject,
  preheader,
}: {
  integration: any;
  subject: string;
  preheader: string;
}) => {
  const { classes } = useStyles();

  return (
    <>
      <EmailMobile>
        <div className={classes.header}>Inbox</div>
        <div className={classes.content}>
          <div className={classes.InboxItem}>
            <Group position="apart">
              <div>
                <EmailIntegrationInfo integration={integration} field={'senderName'} />
              </div>
              <div>
                <span className={classes.date}>{format(new Date(), 'MMM dd')}</span>
                <DateArrow />
              </div>
            </Group>
          </div>
          <div className={classes.subject}>{subject}</div>
          <div className={classes.preheader}>{preheader}</div>
        </div>
        <ItemSkeleton />
        <ItemSkeleton />
      </EmailMobile>
      <div className={classes.bottom}></div>
    </>
  );
};
