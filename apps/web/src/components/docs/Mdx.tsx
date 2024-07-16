import { Accordion, Alert, Code, Paper } from '@mantine/core';
import { Tabs, Tooltip } from '@novu/design-system';
import { IconInfoOutline, IconOutlineWarning } from '@novu/novui/icons';
import { css } from '@novu/novui/css';
import { Flex, Grid, GridItem, styled } from '@novu/novui/jsx';
// eslint-disable-next-line import/no-namespace
import * as mdxBundler from 'mdx-bundler/client';
import { useMemo, ReactNode, PropsWithChildren, useEffect } from 'react';
import { DOCS_URL, MINTLIFY_IMAGE_URL } from './docs.const';
import { Highlight } from './Highlight';
import { Title, Text } from '@novu/novui';
import { text } from '@novu/novui/recipes';
import { DocsQueryResults } from './useLoadDocs';
import { DOCS_WRAPPER_ELEMENT_ID } from './Docs';
import { createGlobals } from './globals';

const LiText = styled('span', text);

const BaseDocsComponent = ({ children }: { children: ReactNode }) => <div>{children}</div>;

const getMDXComponent = mdxBundler.getMDXComponent;

type DocsProps = PropsWithChildren<
  Pick<DocsQueryResults, 'code' | 'mappings'> & {
    isChildDocs?: boolean;
    isLoading?: boolean;
  }
>;

/*
 * Render the mdx for our mintlify docs inside of the web, tries to map the markdown to react components.
 */
export const Mdx = ({ code = '', mappings = {}, isChildDocs, children, isLoading }: DocsProps) => {
  const Component = useMemo(() => {
    if (code.length === 0) {
      return null;
    }

    const globals = createGlobals(mappings);

    return getMDXComponent(code, globals);
  }, [code, mappings]);

  // Workaround for img tags that is not parsed correctly by mdx-bundler
  useEffect(() => {
    if (Component === null || isLoading) {
      return;
    }

    const docs = document.getElementById(DOCS_WRAPPER_ELEMENT_ID);

    if (!docs) {
      return;
    }

    const images = Array.from(docs.getElementsByTagName('img'));

    for (const img of images) {
      if (img.src.startsWith(MINTLIFY_IMAGE_URL)) {
        continue;
      }

      const url = new URL(img.src);
      img.src = `${MINTLIFY_IMAGE_URL}${url.pathname}`;
    }
  }, [Component, isLoading]);

  if (Component === null) {
    if (isChildDocs) {
      return <Text>We could not load this part of the documentation for you. Please try again.</Text>;
    }

    return (
      <Flex
        className={css({
          marginTop: '[4rem]',
        })}
        justify="center"
        align="center"
      >
        <Text>We could not load the documentation for you. Please try again.</Text>
        {children}
      </Flex>
    );
  }

  return (
    <>
      <Component
        components={{
          CodeGroup: BaseDocsComponent,
          ResponseExample: BaseDocsComponent,
          RequestExample: BaseDocsComponent,
          ParamField: BaseDocsComponent,
          Expandable: BaseDocsComponent,
          tr: ({ className, ...props }: any) => {
            return (
              <tr
                {...props}
                className={css({
                  height: '250',
                  lineHeight: '125',
                  borderBottom: 'solid',
                  borderBottomColor: 'table.border.row',
                })}
              />
            );
          },
          thead: ({ className, ...props }: any) => {
            return (
              <thead
                {...props}
                className={css({
                  height: '150',
                  lineHeight: '125',
                  color: 'typography.text.main',
                  borderBottomColor: 'table.border.header',
                })}
              />
            );
          },
          Frame: ({ className, ...props }: any) => {
            const src = Array.isArray(props.children)
              ? props.children.find((child) => child.type === 'img')?.props.src
              : props.children.props?.src;

            const alt =
              (Array.isArray(props.children)
                ? props.children.find((child) => child.type === 'img')?.props.alt
                : props.children.props?.alt) || '';

            if (!src) {
              return (
                <div {...props}>
                  <Text className={css({ textAlign: 'center', fontStyle: 'italic' })}>{props.caption}</Text>
                </div>
              );
            }

            return (
              <div {...props}>
                <img alt={alt} src={`${MINTLIFY_IMAGE_URL}${src}`} />
                <Text className={css({ textAlign: 'center', fontStyle: 'italic' })}>{props.caption}</Text>
              </div>
            );
          },
          Info: ({ className, ...props }: any) => {
            return (
              <Alert
                className={css({
                  borderRadius: '75',
                  backgroundColor: 'mauve.60.dark !important',
                  '& p': {
                    color: 'legacy.white !important',
                  },
                })}
                {...props}
                icon={<IconInfoOutline className={css({ color: 'legacy.white !important' })} />}
              />
            );
          },
          Snippet: () => {
            return null;
          },
          Steps: ({ className, ...props }: any) => {
            return (
              <ol
                className={css({
                  lineHeight: '125',
                  listStyleType: 'decimal',
                  listStylePosition: 'inside',
                })}
              >
                {props.children}
              </ol>
            );
          },
          Step: ({ className, ...props }: any) => {
            return (
              <li className={css({ lineHeight: '125', marginBottom: '50' })}>
                <LiText className={css({ lineHeight: '150', fontSize: '100', fontWeight: 'bolder' })}>
                  {props.title}
                </LiText>
                <LiText className={css({ lineHeight: '125' })}>{props.children}</LiText>
              </li>
            );
          },
          Warning: ({ className, ...props }: any) => {
            return (
              <Alert
                className={css({
                  borderRadius: '75',
                  backgroundColor: 'amber.60.dark !important',
                  '& p': {
                    color: 'legacy.white !important',
                  },
                })}
                {...props}
                icon={<IconOutlineWarning className={css({ color: 'legacy.white !important' })} />}
              />
            );
          },
          Note: ({ className, ...props }: any) => {
            return (
              <Alert
                className={css({
                  borderRadius: '75',
                  backgroundColor: 'blue.70.dark !important',
                  '& p': {
                    color: 'legacy.white !important',
                  },
                })}
                {...props}
                icon={<IconInfoOutline className={css({ color: 'legacy.white !important' })} />}
              />
            );
          },
          CardGroup: ({ className, ...props }: any) => {
            return (
              <Grid gap={16} columns={props.cols}>
                {props.children}
              </Grid>
            );
          },
          AccordionGroup: ({ className, ...props }: any) => {
            return <Accordion {...props} />;
          },
          Tab: () => null,
          Tabs: ({ className, ...props }: any) => {
            const tabs = Array.isArray(props.children) ? props.children : [props.children];

            return (
              <Tabs
                menuTabs={tabs.map((tab) => {
                  return {
                    content: tab.props.children,
                    value: tab.props.title,
                  };
                })}
                defaultValue={tabs[0].props.title}
              />
            );
          },
          Tip: ({ className, ...props }: any) => {
            return (
              <Alert
                className={css({
                  borderRadius: '75',
                  backgroundColor: 'mauve.60.dark !important',
                  '& p': {
                    color: 'legacy.white !important',
                  },
                })}
                {...props}
                icon={<IconInfoOutline className={css({ color: 'legacy.white !important' })} />}
              />
            );
          },
          Tooltip: ({ className, ...props }: any) => {
            return (
              <Tooltip label={props.tip}>
                <span>{props.children}</span>
              </Tooltip>
            );
          },
          code: ({ className, ...props }: any) => {
            if (className?.includes('language-')) {
              return <Highlight {...props} />;
            }

            return <Code {...props} />;
          },
          Card: ({ className, ...props }: any) => {
            return (
              <GridItem colSpan={1}>
                <Paper>
                  <Title variant="section">
                    <a href={`${DOCS_URL}${props.href}`} rel={'noopener noreferrer'} target={'_blank'}>
                      {props.title}
                    </a>
                  </Title>
                </Paper>
              </GridItem>
            );
          },
          Accordion: ({ className, ...props }: any) => {
            return (
              <Accordion.Item value={props.title}>
                <Accordion.Control>{props.title}</Accordion.Control>
                <Accordion.Panel>{props.children}</Accordion.Panel>
              </Accordion.Item>
            );
          },
          p: ({ className, ...props }: any) => {
            return <Text className={css({ lineHeight: '125' })} {...props} />;
          },
          ol: ({ className, ...props }: any) => {
            return (
              <ol
                className={css({
                  lineHeight: '125',
                  listStyleType: 'decimal',
                  listStylePosition: 'inside',
                  '& p': {
                    display: 'inline !important',
                  },
                })}
                {...props}
              />
            );
          },
          ul: ({ className, ...props }: any) => {
            return (
              <ul
                className={css({
                  lineHeight: '125',
                  listStyleType: 'disc',
                  listStylePosition: 'inside',
                  '& p': {
                    display: 'inline !important',
                  },
                })}
                {...props}
              />
            );
          },
          li: ({ className, ...props }: any) => {
            return <li className={css({ lineHeight: '125', marginBottom: '50' })} {...props} />;
          },
          h2: ({ className, ...props }: any) => {
            return <Title variant="section" className={css({ marginTop: '75' })} {...props} />;
          },
          h3: ({ className, ...props }: any) => {
            return <Title variant="subsection" {...props} />;
          },
          a: ({ className, ...props }: any) => {
            return (
              <a
                href={`${DOCS_URL}${props.href}`}
                rel={'noopener noreferrer'}
                target={'_blank'}
                children={props.children}
              />
            );
          },
        }}
      />
    </>
  );
};
