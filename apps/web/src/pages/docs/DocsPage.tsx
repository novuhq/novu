import { PageContainer, Tabs, Text, Title, Tooltip } from '@novu/design-system';
import { Accordion, Alert, Grid, Paper, Stack } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as mdxBundler from 'mdx-bundler/client';
import { Highlight } from './Highlight';
import { useQuery } from '@tanstack/react-query';
import { useSegment } from '@novu/shared-web';

const getMDXComponent = mdxBundler.getMDXComponent;

export const DocsPage = () => {
  const params = useParams();
  const segment = useSegment();
  const path = useMemo(() => params['*'], [params]);

  const { isLoading, data: { code } = { code: '' } } = useQuery(['docs', path], async () => {
    const response = await fetch('http://localhost:5173/' + path);
    const json = await response.json();

    return json;
  });

  useEffect(() => {
    segment.track('Open Inline Documentation', {
      documentationPage: path,
    });
  }, [path, segment]);

  const Component = useMemo(() => {
    if (code.length === 0) {
      return null;
    }

    return getMDXComponent(code);
  }, [code]);

  if (isLoading || Component === null) {
    return null;
  }

  return (
    <PageContainer title="Docs">
      <Stack p={20} spacing={8}>
        <Component
          components={{
            Frame: ({ className, ...props }: any) => {
              return (
                <div {...props}>
                  <img alt="" src={`https://mintlify.s3-us-west-1.amazonaws.com/novu${props.children.props.src}`} />
                  <Text align="center" size="sm">
                    {props.caption}
                  </Text>
                </div>
              );
            },
            Info: ({ className, ...props }: any) => {
              return <Alert color="blue" {...props} />;
            },
            Snippet: () => {
              return null;
            },
            Warning: ({ className, ...props }: any) => {
              return <Alert color="yellow" {...props} />;
            },
            Note: ({ className, ...props }: any) => {
              return <Alert color="gray" {...props} />;
            },
            CardGroup: ({ className, ...props }: any) => {
              return (
                <Grid gutter={16} columns={props.cols}>
                  {props.children}
                </Grid>
              );
            },
            AccordionGroup: ({ className, ...props }: any) => {
              return <Accordion {...props} />;
            },
            Tab: () => null,
            Tabs: ({ className, ...props }: any) => {
              const children = Array.isArray(props.children) ? props.children : [props.children];

              return (
                <Tabs
                  menuTabs={children.map((tab) => {
                    return {
                      content: tab.props.children,
                      value: tab.props.title,
                    };
                  })}
                  defaultValue={children[0].props.title}
                />
              );
            },
            Tip: ({ className, ...props }: any) => {
              return <Alert color="blue" {...props} />;
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

              return <code {...props} />;
            },
            Card: ({ className, ...props }: any) => {
              const LinkComponet = props.href.includes('api-reference') ? 'a' : Link;
              const LinkProps = props.href.includes('api-reference')
                ? { href: `https://docs.novu.co${props.href}` }
                : { to: `/docs${props.href}` };

              return (
                <Grid.Col span={1}>
                  <Paper>
                    <Title size={2}>
                      <LinkComponet
                        {...(LinkProps as any)}
                        rel={props.href.includes('api-reference') ? 'noopener noreferrer' : undefined}
                        target={props.href.includes('api-reference') ? '_blank' : '_self'}
                      >
                        {props.title}
                      </LinkComponet>
                    </Title>
                  </Paper>
                </Grid.Col>
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
              return <Text {...props} />;
            },
            h2: ({ className, ...props }: any) => {
              return <Title size={2} {...props} />;
            },
            h3: ({ className, ...props }: any) => {
              return <Title size={2} {...props} />;
            },
          }}
        />
      </Stack>
    </PageContainer>
  );
};
