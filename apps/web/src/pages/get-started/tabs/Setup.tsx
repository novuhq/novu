import { NextJSLogo, SvelteLogo, H3Logo, RemixLogo, ExpressLogo, NuxtLogo } from '../Logos';
import { motion, AnimatePresence, useAnimate, stagger } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { Timeline as MantineTimeline, Button, Code } from '@mantine/core';
import { css } from '@novu/novui/css';
import { OnboardingStepsTimeline } from '../OnboardingSteps';
import { CodeSnippet } from '../legacy-onboarding/components/CodeSnippet';
import { useStudioState } from '../../../studio/StudioStateProvider';
import { useEnvironment } from '../../../hooks/useEnvironment';
import { CodeEditor } from '../CodeBlock';
import { TextElement } from '../TextElement';

export const buildGuides = [
  {
    id: 'nextjs',
    title: 'Next.js',
    logo: NextJSLogo,
    steps: [
      {
        title: 'Initialize a new project',
        content: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { environment } = useEnvironment();

          return <CodeSnippet command={`npx novu@latest init --secret-key=${(environment as any)?.apiKeys[0].key}`} />;
        },
      },
      {
        title: 'Run the application server',
        content: () => {
          return <CodeSnippet command={`cd my-novu-app && npm run dev`} />;
        },
      },
      {
        title: 'Create a workflow',
        content: () => {
          return (
            <div>
              <TextElement>
                To define a new workflow you will use the <code>@novu/framework</code> Typescript SDK.
                <br />
                In a new file let's define a sample workflow and review it's building blocks:
                <br /> <br />
              </TextElement>

              <CodeEditor
                height="200px"
                readonly
                setCode={() => {}}
                code={`import { workflow } from '@novu/framework';

export const myWorkflow = workflow('my-workflow', async ({ step }) => {
  await step.email('step', async (controls) => {
    return {
      subject: controls.subject,
      body: '<h1>Hello World</h1>',
    }
  })
});
                `}
              />
            </div>
          );
        },
      },
      {
        title: 'Expose your workflow',
        content: () => {
          return (
            <>
              <TextElement>
                Once a workflow has been created, we would need to expose it to the <code>serve</code> function
              </TextElement>
              <br /> <br />
              <CodeEditor
                height="120px"
                readonly
                setCode={() => {}}
                code={`import { serve } from '@novu/framework/next';
import { myWorkflow } from '../../novu/workflows';

export const { GET, POST, OPTIONS } = serve({
  workflows: [myWorkflow],
});

                `}
              />
            </>
          );
        },
      },
      {
        title: 'Run Novu Studio',
        content: () => {
          return (
            <TextElement>
              Novu Studio is used to preview your local workflows, inspect controls and send test workflows to your
              email.
              <br />
              To Start Novu Studio, run the following command in your terminal:
              <br />
              <br />
              <CodeSnippet command={`npx novu@latest dev --port 4000`} />;
            </TextElement>
          );
        },
      },
      {
        title: 'Send a test notification',
        content: () => {
          return (
            <TextElement>
              Once the Studio is open, navigate to the 'my-workflow' tab and click on the 'Send test' button.
            </TextElement>
          );
        },
      },
    ],
  },
  {
    id: 'svelte',
    title: 'Svelte',
    logo: SvelteLogo,
    steps: [
      {
        title: 'Install the framework package',
        content: () => {
          return (
            <TextElement>
              <CodeSnippet command="npm install @novu/framework zod zod-to-json-schema" />
            </TextElement>
          );
        },
      },
      {
        title: 'Expose your workflow',
        content: () => {
          return (
            <>
              <TextElement>
                Once a workflow has been created, we would need to expose it to the <code>serve</code> function
              </TextElement>
              <br /> <br />
              <CodeEditor
                height="120px"
                readonly
                setCode={() => {}}
                code={`import { testWorkflow } from '$lib/novu/workflows';
import { serve } from '@novu/framework/sveltekit';

export const { GET, POST, OPTIONS } = serve({ workflows: [testWorkflow] });
                `}
              />
            </>
          );
        },
      },
      {
        title: 'Add a Novu Secret Key Environment Variable',
        content: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { environment } = useEnvironment();

          return (
            <TextElement>
              Add <Code>NOVU_SECRET_KEY</Code> environment variable to your <Code>.env</Code> file
              <CodeSnippet command={`NOVU_SECRET_KEY=${(environment as any)?.apiKeys[0].key}`} />
            </TextElement>
          );
        },
      },
      {
        title: 'Run the application server',
        content: () => {
          return <CodeSnippet command={`cd my-novu-app && npm run dev`} />;
        },
      },
      {
        title: 'Run Novu Studio',
        content: () => {
          return (
            <TextElement>
              Novu Studio is used to preview your local workflows, inspect controls and send test workflows to your
              email.
              <br />
              To Start Novu Studio, run the following command in your terminal:
              <br />
              <br />
              <CodeSnippet command={`npx novu@latest dev --port 4000`} />;
            </TextElement>
          );
        },
      },
      {
        title: 'Send a test notification',
        content: () => {
          return (
            <TextElement>
              Once the Studio is open, navigate to the 'my-workflow' tab and click on the 'Send test' button.
            </TextElement>
          );
        },
      },
    ],
  },
  {
    id: 'remix',
    title: 'Remix',
    logo: RemixLogo,
    steps: [
      {
        title: 'Install the framework package',
        content: () => {
          return (
            <TextElement>
              <CodeSnippet command="npm install @novu/framework zod zod-to-json-schema" />
            </TextElement>
          );
        },
      },
      {
        title: 'Expose your workflow',
        content: () => {
          return (
            <>
              <TextElement>
                Once a workflow has been created, we would need to expose it to the <code>serve</code> function
              </TextElement>
              <br /> <br />
              <CodeEditor
                height="120px"
                readonly
                setCode={() => {}}
                code={`import { testWorkflow } from '$lib/novu/workflows';
import { serve } from '@novu/framework/sveltekit';

export const { GET, POST, OPTIONS } = serve({ workflows: [testWorkflow] });
                `}
              />
            </>
          );
        },
      },
      {
        title: 'Add a Novu Secret Key Environment Variable',
        content: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { environment } = useEnvironment();

          return (
            <TextElement>
              Add <Code>NOVU_SECRET_KEY</Code> environment variable to your <Code>.env</Code> file
              <CodeSnippet command={`NOVU_SECRET_KEY=${(environment as any)?.apiKeys[0].key}`} />
            </TextElement>
          );
        },
      },
      {
        title: 'Run the application server',
        content: () => {
          return <CodeSnippet command={`cd my-novu-app && npm run dev`} />;
        },
      },
      {
        title: 'Run Novu Studio',
        content: () => {
          return (
            <TextElement>
              Novu Studio is used to preview your local workflows, inspect controls and send test workflows to your
              email.
              <br />
              To Start Novu Studio, run the following command in your terminal:
              <br />
              <br />
              <CodeSnippet command={`npx novu@latest dev --port 4000`} />;
            </TextElement>
          );
        },
      },
      {
        title: 'Send a test notification',
        content: () => {
          return (
            <TextElement>
              Once the Studio is open, navigate to the 'my-workflow' tab and click on the 'Send test' button.
            </TextElement>
          );
        },
      },
    ],
  },
  {
    id: 'express',
    title: 'Express.js',
    logo: ExpressLogo,
    steps: [
      {
        title: 'Install the framework package',
        content: () => {
          return (
            <TextElement>
              <CodeSnippet command="npm install @novu/framework zod zod-to-json-schema" />
            </TextElement>
          );
        },
      },
      {
        title: 'Expose your workflow',
        content: () => {
          return (
            <>
              <TextElement>
                Once a workflow has been created, we would need to expose it to the <code>serve</code> function
              </TextElement>
              <br /> <br />
              <CodeEditor
                height="120px"
                readonly
                setCode={() => {}}
                code={`import { testWorkflow } from '$lib/novu/workflows';
import { serve } from '@novu/framework/sveltekit';

export const { GET, POST, OPTIONS } = serve({ workflows: [testWorkflow] });
                `}
              />
            </>
          );
        },
      },
      {
        title: 'Add a Novu Secret Key Environment Variable',
        content: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { environment } = useEnvironment();

          return (
            <TextElement>
              Add <Code>NOVU_SECRET_KEY</Code> environment variable to your <Code>.env</Code> file
              <CodeSnippet command={`NOVU_SECRET_KEY=${(environment as any)?.apiKeys[0].key}`} />
            </TextElement>
          );
        },
      },
      {
        title: 'Run the application server',
        content: () => {
          return <CodeSnippet command={`cd my-novu-app && npm run dev`} />;
        },
      },
      {
        title: 'Run Novu Studio',
        content: () => {
          return (
            <TextElement>
              Novu Studio is used to preview your local workflows, inspect controls and send test workflows to your
              email.
              <br />
              To Start Novu Studio, run the following command in your terminal:
              <br />
              <br />
              <CodeSnippet command={`npx novu@latest dev --port 4000`} />;
            </TextElement>
          );
        },
      },
      {
        title: 'Send a test notification',
        content: () => {
          return (
            <TextElement>
              Once the Studio is open, navigate to the 'my-workflow' tab and click on the 'Send test' button.
            </TextElement>
          );
        },
      },
    ],
  },
  {
    id: 'nuxt',
    title: 'Nuxt',
    logo: NuxtLogo,
    steps: [
      {
        title: 'Install the framework package',
        content: () => {
          return (
            <TextElement>
              <CodeSnippet command="npm install @novu/framework zod zod-to-json-schema" />
            </TextElement>
          );
        },
      },
      {
        title: 'Expose your workflow',
        content: () => {
          return (
            <>
              <TextElement>
                Once a workflow has been created, we would need to expose it to the <code>serve</code> function
              </TextElement>
              <br /> <br />
              <CodeEditor
                height="120px"
                readonly
                setCode={() => {}}
                code={`import { testWorkflow } from '$lib/novu/workflows';
import { serve } from '@novu/framework/sveltekit';

export const { GET, POST, OPTIONS } = serve({ workflows: [testWorkflow] });
                `}
              />
            </>
          );
        },
      },
      {
        title: 'Add a Novu Secret Key Environment Variable',
        content: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { environment } = useEnvironment();

          return (
            <TextElement>
              Add <Code>NOVU_SECRET_KEY</Code> environment variable to your <Code>.env</Code> file
              <CodeSnippet command={`NOVU_SECRET_KEY=${(environment as any)?.apiKeys[0].key}`} />
            </TextElement>
          );
        },
      },
      {
        title: 'Run the application server',
        content: () => {
          return <CodeSnippet command={`cd my-novu-app && npm run dev`} />;
        },
      },
      {
        title: 'Run Novu Studio',
        content: () => {
          return (
            <TextElement>
              Novu Studio is used to preview your local workflows, inspect controls and send test workflows to your
              email.
              <br />
              To Start Novu Studio, run the following command in your terminal:
              <br />
              <br />
              <CodeSnippet command={`npx novu@latest dev --port 4000`} />;
            </TextElement>
          );
        },
      },
      {
        title: 'Send a test notification',
        content: () => {
          return (
            <TextElement>
              Once the Studio is open, navigate to the 'my-workflow' tab and click on the 'Send test' button.
            </TextElement>
          );
        },
      },
    ],
  },
  {
    id: 'h3',
    title: 'H3',
    logo: H3Logo,
    steps: [
      {
        title: 'Install the framework package',
        content: () => {
          return (
            <TextElement>
              <CodeSnippet command="npm install @novu/framework zod zod-to-json-schema" />
            </TextElement>
          );
        },
      },
      {
        title: 'Expose your workflow',
        content: () => {
          return (
            <>
              <TextElement>
                Once a workflow has been created, we would need to expose it to the <code>serve</code> function
              </TextElement>
              <br /> <br />
              <CodeEditor
                height="120px"
                readonly
                setCode={() => {}}
                code={`import { testWorkflow } from '$lib/novu/workflows';
import { serve } from '@novu/framework/sveltekit';

export const { GET, POST, OPTIONS } = serve({ workflows: [testWorkflow] });
                `}
              />
            </>
          );
        },
      },
      {
        title: 'Add a Novu Secret Key Environment Variable',
        content: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { environment } = useEnvironment();

          return (
            <TextElement>
              Add <Code>NOVU_SECRET_KEY</Code> environment variable to your <Code>.env</Code> file
              <CodeSnippet command={`NOVU_SECRET_KEY=${(environment as any)?.apiKeys[0].key}`} />
            </TextElement>
          );
        },
      },
      {
        title: 'Run the application server',
        content: () => {
          return <CodeSnippet command={`cd my-novu-app && npm run dev`} />;
        },
      },
      {
        title: 'Run Novu Studio',
        content: () => {
          return (
            <TextElement>
              Novu Studio is used to preview your local workflows, inspect controls and send test workflows to your
              email.
              <br />
              To Start Novu Studio, run the following command in your terminal:
              <br />
              <br />
              <CodeSnippet command={`npx novu@latest dev --port 4000`} />;
            </TextElement>
          );
        },
      },
      {
        title: 'Send a test notification',
        content: () => {
          return (
            <TextElement>
              Once the Studio is open, navigate to the 'my-workflow' tab and click on the 'Send test' button.
            </TextElement>
          );
        },
      },
    ],
  },
];

export function SetupTab() {
  const [activeGuide, setActiveGuide] = useState('nextjs');
  const handleGuideClick = (guideId) => {
    setActiveGuide(guideId);
  };

  const activeGuideData = buildGuides.find((guide) => guide.id === activeGuide);

  return (
    <>
      <CardButtonGroupWrapper>
        {buildGuides.map((guide) => (
          <motion.div key={guide.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <CardButton active={guide.id === activeGuide} onClick={() => handleGuideClick(guide.id)}>
              <guide.logo />
              {guide.title}
            </CardButton>
          </motion.div>
        ))}
      </CardButtonGroupWrapper>
      <OnboardingStepsTimeline steps={activeGuideData?.steps || []} activeGuide={activeGuide} />
    </>
  );
}

function CardButton({
  children,
  active = false,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      data-active={active}
      variant={active ? 'light' : 'subtle'}
      classNames={{
        root: css({
          padding: '6px 16px !important',
          display: 'flex !important',
          width: '112px !important',
          minWidth: '112px !important',
          height: 'auto !important',
          borderRadius: '12px !important',
          justifyContent: 'center !important',
          '& .mantine-Button-label svg': {
            fill: 'typography.text.secondary !important',
          },
          '&[data-active="true"]': {
            backgroundColor: '#292933 !important',
          },
          '&[data-active="true"] .mantine-Button-label svg': {
            fill: '#fff !important',
          },
          '&[data-active="true"] .mantine-Button-label': {
            color: '#fff !important',
          },
          _hover: {
            backgroundColor: '#23232B !important',
          },
        }),
        label: css({
          padding: '16px !important',
          display: 'flex !important',
          flexDirection: 'column !important',
          fontSize: '14px !important',
          fontWeight: '400 !important',
          color: 'typography.text.secondary !important',
          '& svg': {
            width: '32px !important',
            height: '32px !important',
            marginBottom: '8px !important',
            color: 'typography.text.secondary !important',
          },
        }),
      }}
    >
      {children}
    </Button>
  );
}

function CardButtonGroupWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className={css({ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' })}>{children}</div>
  );
}
