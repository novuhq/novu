import { colors, IconInfoOutline, IconOutlineWarning, Tabs, Tooltip } from '@novu/design-system';
import { Accordion, Alert, Code, Loader, Paper } from '@mantine/core';
import { ReactNode, useEffect, useMemo } from 'react';
import * as mdxBundler from 'mdx-bundler/client';
import { Highlight } from './Highlight';
import { useQuery } from '@tanstack/react-query';
import { useSegment } from '@novu/shared-web';
import { Center, Flex, Grid, GridItem, styled, VStack } from '../../styled-system/jsx';
import { css } from '../../styled-system/css';
import { text, title as RTitle } from '../../styled-system/recipes';

const Text = styled('p', text);
const TitleH2 = styled('h2', RTitle);
const TitleH3 = styled('h3', RTitle);
const TitleH1 = styled('h1', RTitle);

const getMDXComponent = mdxBundler.getMDXComponent;

export const Docs = ({ path = '', children }: { path?: string; children: ReactNode }) => {
  const segment = useSegment();

  const { isLoading, data: { code, title, description } = { code: '', title: '', description: '' } } = useQuery(
    ['docs', path],
    async () => {
      const response = await fetch('http://localhost:5173/' + path);
      const json = await response.json();

      return json;
    }
  );

  useEffect(() => {
    segment.track('Open Inline Documentation', {
      documentationPage: path,
      pageURL: window.location.href,
    });
  }, [path, segment]);

  const Component = useMemo(() => {
    if (code.length === 0) {
      return null;
    }

    return getMDXComponent(code);
  }, [code]);

  // Workaround for img tags that is not parsed correctly by mdx-bundler
  useEffect(() => {
    if (Component === null || isLoading) {
      return;
    }

    const docs = document.getElementById('docs');

    if (!docs) {
      return;
    }

    const images = Array.from(docs.getElementsByTagName('img'));

    for (const img of images) {
      if (img.src.includes('mintlify.s3-us-west-1.amazonaws.com')) {
        continue;
      }

      const url = new URL(img.src);
      img.src = `https://mintlify.s3-us-west-1.amazonaws.com/novu${url.pathname}`;
    }
  }, [Component, isLoading]);

  if (isLoading) {
    return (
      <Center
        className={css({
          marginTop: 64,
        })}
      >
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  if (Component === null) {
    return (
      <Flex
        className={css({
          marginTop: 64,
        })}
        justify="center"
        align="center"
      >
        <Text>We could not load the documenation for you, please try again.</Text>
        {children}
      </Flex>
    );
  }

  return (
    <VStack alignItems="unset" id="docs" gap={12}>
      <div>
        <Flex justify="space-between" align="center">
          <TitleH1>{title}</TitleH1>
          {children}
        </Flex>
        <Text>{description}</Text>
      </div>
      <Component
        components={{
          tr: ({ className, ...props }: any) => {
            return (
              <tr
                {...props}
                className={css({
                  height: '250',
                  lineHeight: '125',
                  borderBottom: `1px solid`,
                  borderBottomColor: 'legacy.B20',
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
                  color: 'legacy.B40',
                  borderBottomColor: 'legacy.B30',
                })}
              />
            );
          },
          Frame: ({ className, ...props }: any) => {
            return (
              <div {...props}>
                <img alt="" src={props.children.props.src} />
                <Text className={css({ textAlign: 'center', fontStyle: 'italic' })}>{props.caption}</Text>
              </div>
            );
          },
          Info: ({ className, ...props }: any) => {
            return (
              <Alert style={{ borderRadius: 12 }} color="gray" {...props} icon={<IconInfoOutline color="white" />} />
            );
          },
          Snippet: () => {
            return null;
          },
          Steps: ({ className, ...props }: any) => {
            return <ol className={css({ lineHeight: '125', listStyleType: 'decimal' })}>{props.children}</ol>;
          },
          Step: ({ className, ...props }: any) => {
            return (
              <li className={css({ paddingLeft: '100', lineHeight: '125', marginBottom: '50' })}>
                <Text className={css({ lineHeight: '150', fontSize: '100', fontWeight: 'bolder' })}>{props.title}</Text>
                <Text className={css({ lineHeight: '125' })}>{props.children}</Text>
              </li>
            );
          },
          Warning: ({ className, ...props }: any) => {
            return (
              <Alert
                style={{ borderRadius: 12 }}
                color="yellow"
                {...props}
                icon={<IconOutlineWarning color="white" />}
              />
            );
          },
          Note: ({ className, ...props }: any) => {
            return (
              <Alert style={{ borderRadius: 12 }} color="blue" {...props} icon={<IconInfoOutline color="white" />} />
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
              <Alert style={{ borderRadius: 12 }} color="gray" {...props} icon={<IconInfoOutline color="white" />} />
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
                  <TitleH2>
                    <a href={`https://docs.novu.co${props.href}`} rel={'noopener noreferrer'} target={'_blank'}>
                      {props.title}
                    </a>
                  </TitleH2>
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
            return <ol className={css({ lineHeight: '125', listStyleType: 'decimal' })} {...props} />;
          },
          ul: ({ className, ...props }: any) => {
            return <ul className={css({ lineHeight: '125', listStyleType: 'disc' })} {...props} />;
          },
          li: ({ className, ...props }: any) => {
            return <li className={css({ lineHeight: '125', marginBottom: '50' })} {...props} />;
          },
          h2: ({ className, ...props }: any) => {
            return <TitleH2 className={css({ marginTop: '75' })} {...props} />;
          },
          h3: ({ className, ...props }: any) => {
            return <TitleH3 {...props} />;
          },
          a: ({ className, ...props }: any) => {
            return (
              <a
                href={`https://docs.novu.co${props.href}`}
                rel={'noopener noreferrer'}
                target={'_blank'}
                children={props.children}
              />
            );
          },
        }}
      />
    </VStack>
  );
};
