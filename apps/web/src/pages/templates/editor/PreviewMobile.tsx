import { createStyles, Group } from '@mantine/core';
import { format } from 'date-fns';
import Frame from 'react-frame-component';
import { colors } from '../../../design-system';
import { PreviewDateIcon } from './PreviewDateIcon';
import { PreviewUserIcon } from './PreviewUserIcon';

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
}));

export const PreviewMobile = ({
  integration,
  subject,
  content,
}: {
  integration: any;
  subject: string;
  content?: string;
}) => {
  const { classes } = useStyles();

  return (
    <>
      <div className={classes.phone}>
        <div className={classes.cameraDent}></div>
        <div
          style={{
            width: '100%',
            marginTop: '20px',
            paddingLeft: '15px',
            paddingRight: '15px',
          }}
        >
          <Group
            sx={{
              height: '40px',
            }}
            spacing={20}
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
                  <div
                    style={{
                      marginBottom: '3px',
                      fontWeight: 'bolder',
                    }}
                  >
                    {subject}
                  </div>
                  <div
                    style={{
                      color: colors.B60,
                      fontWeight: 'normal',
                    }}
                  >
                    {integration?.credentials?.from || 'No active email integration'}
                  </div>
                </div>
              </Group>
            </div>
            <div>
              <div
                style={{
                  height: '20px',
                  marginTop: '20px',
                  color: colors.B60,
                  fontWeight: 'normal',
                }}
              >
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
        <div
          style={{
            height: '2px',
            width: '340px',
            marginLeft: '15px',
            marginRight: '15px',
            background: colors.B20,
            marginTop: '19px',
          }}
        ></div>
        <Frame
          style={{
            border: '0px',
            width: '100%',
            height: '609px',
            borderRadius: '0 0 30px 30px',
          }}
          initialContent={content ? content : `<html><head></head><body><div></div></body></html>`}
        >
          <></>
        </Frame>
      </div>
      <div
        style={{
          height: '30px',
        }}
      ></div>
    </>
  );
};
