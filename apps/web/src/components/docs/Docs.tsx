import { Loader } from '@mantine/core';
import { css } from '@novu/novui/css';
import { Flex, Grid, VStack } from '@novu/novui/jsx';
import { token } from '@novu/novui/tokens';
import { PropsWithChildren, ReactNode } from 'react';
import { Title, Text } from '@novu/novui';
import { DocsQueryResults } from './useLoadDocs';
import { useFrameworkTerminalScript } from '../../hooks/useFrameworkTerminalScript';
import { When } from '../utils/When';
import { Mdx } from './Mdx';

export const DOCS_WRAPPER_ELEMENT_ID = 'embedded-docs';

type DocsProps = PropsWithChildren<
  DocsQueryResults & {
    isLoading?: boolean;
    actions?: ReactNode;
    isChildDocs?: boolean;
  }
>;

/*
 * Render the mdx for our mintlify docs inside of the web.
 * Fetching the compiled mdx from another service and then try to map the markdown to react components.
 */
export const Docs = ({
  code = '',
  description = '',
  title = '',
  isLoading,
  children,
  actions = null,
  isChildDocs = false,
  mappings = {},
}: DocsProps) => {
  useFrameworkTerminalScript();

  if (isLoading) {
    return (
      <Grid placeContent={'center'} h="full">
        <Loader color={token('colors.mode.cloud.middle')} size={32} />
      </Grid>
    );
  }

  return (
    <>
      <VStack
        alignItems="unset"
        id={DOCS_WRAPPER_ELEMENT_ID}
        gap="75"
        className={css({
          textAlign: 'justify left',
        })}
      >
        <When truthy={!isChildDocs}>
          <div>
            <Flex justify="space-between" align="center">
              <Title
                variant="page"
                className={css({
                  width: '99%',
                })}
              >
                {title}
              </Title>
              {actions}
            </Flex>
            <Text>{description}</Text>
          </div>
        </When>
        <Mdx code={code} mappings={mappings} isChildDocs={isChildDocs} isLoading={isLoading}>
          {children}
        </Mdx>
      </VStack>
      {children}
    </>
  );
};
