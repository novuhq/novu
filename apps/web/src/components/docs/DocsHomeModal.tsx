import { ActionIcon, Modal } from '@mantine/core';
import {
  colors,
  IconChecklist,
  IconCode,
  IconEditNote,
  IconHandyman,
  IconOpenInNew,
  IconOutlineClose,
  IconOutlineCloudUpload,
  IconOutlineMarkEmailRead,
  IconOutlineSwapCalls,
  IconOutlineZoomIn,
  IconPlayArrow,
  IconSchool,
  IconWidgets,
  IconWrapText,
  Tooltip,
  useColorScheme,
} from '@novu/design-system';
import { css } from '../../styled-system/css';
import { Flex, Grid, GridItem, styled } from '../../styled-system/jsx';
import { title } from '../../styled-system/recipes';
import { When } from '../utils/When';
import { DOCS_URL } from './docs.const';
import { DocsCard } from './DocsCard';
import { ExploreLink } from './ExploreLink';

const ModalTitle = styled('h2', title);

export const DocsHomeModal = ({
  path,
  open,
  setPath,
  toggle,
}: {
  path: string;
  open: boolean;
  setPath: (path: string) => void;
  toggle: () => void;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const onClose = () => {
    toggle();
  };

  return (
    <When truthy={path.length === 0}>
      <Modal
        opened={open}
        onClose={onClose}
        styles={{
          root: {
            zIndex: 10003,
          },
          modal: {
            width: 800,
            padding: '0px !important',
            background: 'transparent',
            boxShadow: 'none',
            borderRadius: 12,
          },
        }}
        withCloseButton={false}
        overlayBlur={1}
        overlayColor={isDark ? colors.BGDark : colors.BGLight}
      >
        <Flex
          className={css({
            marginBottom: '200',
          })}
          justify="space-between"
        >
          <ModalTitle>Explore Novu</ModalTitle>
          <Flex gap="125">
            <Tooltip label="Open docs website">
              <ActionIcon
                variant="transparent"
                onClick={() => {
                  window.open(`${DOCS_URL}/getting-started/introduction`);
                }}
              >
                <IconOpenInNew />
              </ActionIcon>
            </Tooltip>
            <ActionIcon variant="transparent" onClick={onClose}>
              <IconOutlineClose />
            </ActionIcon>
          </Flex>
        </Flex>
        <Grid columns={4} gap="150">
          <GridItem colSpan={1}>
            <DocsCard
              title={'Get started'}
              text={'#Getting Started'}
              Icon={IconChecklist}
              onClick={() => {
                setPath('/getting-started/novu-sign-up');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <DocsCard
              title={'Introduction'}
              text={'#Getting Started'}
              Icon={IconPlayArrow}
              onClick={() => {
                setPath('/getting-started/introduction');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <DocsCard
              title={'How it works'}
              text={'#Getting Started'}
              Icon={IconSchool}
              onClick={() => {
                setPath('/getting-started/how-novu-works');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <DocsCard
              title={'Echo overview'}
              text={'#Getting Started'}
              Icon={IconOutlineZoomIn}
              onClick={() => {
                setPath('/echo/quickstart');
              }}
            />
          </GridItem>
        </Grid>
        <Grid columns={4} gap="150" className={css({ marginTop: '150' })}>
          <GridItem colSpan={1}>
            <DocsCard
              title={'Workflow'}
              text={'#Concepts'}
              Icon={IconOutlineSwapCalls}
              onClick={() => {
                setPath('/echo/concepts/workflows');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <DocsCard
              title={'Steps'}
              text={'#Concepts'}
              Icon={IconWrapText}
              onClick={() => {
                setPath('/echo/concepts/inputs');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <DocsCard
              title={'Content'}
              text={'#Concepts'}
              Icon={IconEditNote}
              onClick={() => {
                setPath('/echo/integrations/react-email');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <DocsCard
              title={'Payload'}
              text={'#Concepts'}
              Icon={IconCode}
              onClick={() => {
                setPath('/echo/concepts/payload');
              }}
            />
          </GridItem>
        </Grid>
        <Grid columns={4} gap="150" className={css({ marginTop: '200' })}>
          <GridItem colSpan={1}>
            <ExploreLink
              title={'Configuration'}
              text={'#SDK'}
              Icon={IconHandyman}
              onClick={() => {
                setPath('/echo/sdk/typescript');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <ExploreLink
              title={'Frameworks'}
              text={'#SDK'}
              Icon={IconWidgets}
              onClick={() => {
                setPath('/echo/sdk/client');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <ExploreLink
              title={'React E-mail'}
              text={'#Integrations'}
              Icon={IconOutlineMarkEmailRead}
              onClick={() => {
                setPath('/echo/integrations/react-email');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <ExploreLink
              title={'JSON Schema'}
              text={'#Recipes'}
              Icon={IconCode}
              onClick={() => {
                setPath('/echo/recipes/json-schema');
              }}
            />
          </GridItem>
        </Grid>
        <Grid columns={4} gap="150" className={css({ marginTop: '150' })}>
          <GridItem colSpan={1}>
            <ExploreLink
              title={'Locally'}
              text={'#Deployment'}
              Icon={IconOutlineCloudUpload}
              onClick={() => {
                setPath('/echo/deployment/production');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <ExploreLink
              title={'GitHub'}
              text={'#Deployment'}
              Icon={IconOutlineCloudUpload}
              onClick={() => {
                setPath('/echo/deployment/actions');
              }}
            />
          </GridItem>
          <GridItem colSpan={1}>
            <ExploreLink
              title={'CLI'}
              text={'#Deployment'}
              Icon={IconOutlineCloudUpload}
              onClick={() => {
                setPath('/echo/deployment/cli');
              }}
            />
          </GridItem>
        </Grid>
      </Modal>
    </When>
  );
};
