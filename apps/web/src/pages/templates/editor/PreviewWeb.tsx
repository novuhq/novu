import { Group } from '@mantine/core';
import { format } from 'date-fns';
import { colors } from '../../../design-system';
import { PreviewDateIcon } from './PreviewDateIcon';
import { PreviewUserIcon } from './PreviewUserIcon';
import Frame from 'react-frame-component';

export const PreviewWeb = ({
  integration,
  subject,
  content,
}: {
  integration: any;
  subject: string;
  content?: string;
}) => {
  return (
    <>
      <div
        style={{
          background: colors.B17,
          marginLeft: '30px',
          marginRight: '30px',
          marginTop: '68px',
          borderRadius: '7px',
        }}
      >
        <div
          style={{
            borderRadius: '7px 7px 0 0',
            background: colors.B20,
            width: '100%',
            height: '45px',
            maxHeight: '45px',
          }}
        >
          <Group
            sx={{
              marginLeft: '20px',
              height: '45px',
            }}
            spacing={7}
          >
            <div
              style={{
                height: '10px',
                width: '10px',
                borderRadius: '10px',
                background: colors.B17,
              }}
            ></div>
            <div
              style={{
                height: '10px',
                width: '10px',
                borderRadius: '10px',
                background: colors.B17,
              }}
            ></div>
            <div
              style={{
                height: '10px',
                width: '10px',
                borderRadius: '10px',
                background: colors.B17,
              }}
            ></div>
          </Group>
        </div>
        <div
          style={{
            width: '90%',
            maxWidth: '643px',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginTop: '40px',
          }}
        >
          <Group
            sx={{
              height: '40px',
            }}
            position="apart"
          >
            <div>
              <Group
                sx={{
                  height: '40px',
                }}
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
                    marginLeft: '15px',
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
            borderRadius: '7px 7px 0 0',
            width: '90%',
            maxWidth: '643px',
            marginLeft: 'auto',
            marginRight: 'auto',
            height: '50vh',
            background: colors.B15,
            marginTop: '20px',
          }}
        >
          <Frame
            style={{
              border: '0px',
              width: '100%',
              height: '100%',
            }}
            initialContent={content ? content : `<html><head></head><body><div></div></body></html>`}
          >
            <></>
          </Frame>
        </div>
      </div>
      <div
        style={{
          width: '100%',
          height: '30px',
        }}
      ></div>
    </>
  );
};
