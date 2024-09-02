import { motion } from 'framer-motion';
import { useState } from 'react';
import { Code } from '@mantine/core';
import { HStack } from '@novu/novui/jsx';
import { css } from '@novu/novui/css';
import { IconOutlineMenuBook } from '@novu/design-system';
import { NextJSLogo, SvelteLogo, H3Logo, RemixLogo, ExpressLogo, NuxtLogo } from '../Logos';
import { OnboardingStepsTimeline } from '../OnboardingSteps';
import { CodeSnippet } from '../legacy-onboarding/components/CodeSnippet';
import { useEnvironment } from '../../../hooks/useEnvironment';
import { CodeEditor } from '../CodeBlock';
import { TextElement } from '../TextElement';
import { CardButton, CardButtonGroupWrapper } from './CardsButtonGroup';
import { useSegment } from '../../../components/providers/SegmentProvider';

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
        title: 'Run Novu Studio',
        content: () => {
          return (
            <TextElement>
              Novu Studio is used to preview your local workflows, inspect controls and trigger test workflows.
              <br />
              To Start Novu Studio, run the following command in your terminal:
              <br />
              <br />
              <CodeSnippet command={`npx novu@latest dev --port 4000`} />
              Change the port in case your application is running on other than port 4000
              <HStack gap="50" className={css({ color: 'typography.text.secondary', mt: '12px' })}>
                <IconOutlineMenuBook />
                <a href="https://docs.novu.co/workflow/studio" target={'_blank'}>
                  Learn more about Novu Studio
                </a>
              </HStack>
            </TextElement>
          );
        },
      },
      {
        title: 'Send a test notification',
        content: () => {
          return (
            <TextElement>
              Once the Studio is open, navigate to the 'my-workflow' tab and click on the 'Send test' button. This will
              send a test notification to your inbox.
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
    steps: getReusableSteps({
      workflowPath: 'src/lib/novu/workflows.ts',
      bridgeEndpointPath: 'src/routes/api/novu/+server.ts',
      bridgeEndpointCode: `import { testWorkflow } from '$lib/novu/workflows';
import { serve } from '@novu/framework/sveltekit';

export const { GET, POST, OPTIONS } = serve({ workflows: [testWorkflow] });`,
    }),
  },
  {
    id: 'remix',
    title: 'Remix',
    logo: RemixLogo,
    steps: getReusableSteps({
      workflowPath: 'app/novu/workflows.ts',
      bridgeEndpointPath: 'app/routes/api.novu.ts',
      bridgeEndpointCode: `import { serve } from "@novu/framework/remix";
import { testWorkflow } from "../novu/workflows";

const handler = serve({ workflows: [testWorkflow] });

export { handler as action, handler as loader };`,
    }),
  },
  {
    id: 'express',
    title: 'Express.js',
    logo: ExpressLogo,
    steps: getReusableSteps({
      workflowPath: 'app/novu/workflows.ts',
      bridgeEndpointPath: 'app/server.ts',
      bridgeEndpointCode: `import { serve } from "@novu/framework/express";
import { testWorkflow } from "../novu/workflows";

app.use(express.json()); // Required for Novu POST requests
app.use( "/api/novu", serve({ workflows: [testWorkflow] }) );`,
    }),
  },
  {
    id: 'nuxt',
    title: 'Nuxt',
    logo: NuxtLogo,
    steps: getReusableSteps({
      workflowPath: 'app/novu/workflows.ts',
      bridgeEndpointPath: 'app/server/api/novu.ts',
      bridgeEndpointCode: `import { serve } from '@novu/framework/nuxt';
import { testWorkflow } from "../novu/workflows";

export default defineEventHandler(serve({ workflows: [testWorkflow] }));`,
    }),
  },
  {
    id: 'h3',
    title: 'H3',
    logo: H3Logo,
    steps: getReusableSteps({
      workflowPath: 'app/novu/workflows.ts',
      bridgeEndpointPath: 'app/server/api/novu.ts',
      bridgeEndpointCode: `import { createApp, eventHandler, toNodeListener } from "h3";
import { serve } from "@novu/framework/h3";
import { createServer } from "node:http";
import { testWorkflow } from "./novu/workflows";

const app = createApp();

app.use("/api/novu", eventHandler(serve({ workflows: [testWorkflow] }) ));

createServer(toNodeListener(app)).listen(4000);`,
    }),
  },
];

function getReusableSteps({
  workflowPath,
  bridgeEndpointPath,
  bridgeEndpointCode,
}: {
  workflowPath: string;
  bridgeEndpointPath: string;
  bridgeEndpointCode: string;
}) {
  return [
    {
      title: 'Install the framework package',
      content: () => (
        <TextElement>
          To start working with Novu we would need to install the <Code>@novu/framework</Code> package. We also
          recommend installing Zod for defining your controls and trigger payload.
          <CodeSnippet command="npm install @novu/framework zod zod-to-json-schema" />
        </TextElement>
      ),
    },
    {
      title: 'Connect the bridge endpoint',
      content: () => (
        <>
          <TextElement>
            Now, we would need to expose the bridge endpoint via the <code>serve</code> function at{' '}
            <Code>{bridgeEndpointPath}</Code>
          </TextElement>
          <br /> <br />
          <CodeEditor height="120px" readonly setCode={() => {}} code={bridgeEndpointCode} />
        </>
      ),
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
      title: 'Create a workflow',
      content: () => (
        <>
          <TextElement>
            Create a new workflows file at a novu folder at <Code>{workflowPath}</Code> that will contain your workflow
            definitions. You can also organize your workflows in separate files
          </TextElement>
          <br /> <br />
          <CodeEditor
            height="400px"
            readonly
            setCode={() => {}}
            code={`import { workflow } from '@novu/framework';
import { z } from 'zod';

export const testWorkflow = workflow('test-workflow', async ({ step, payload }) => {
  await step.email('send-email', async (controls) => {
    return {
      subject: controls.subject,
      body: 'This is your first Novu Email ' + payload.userName,
    };
  }, {
    controlSchema: z.object({
      subject: z.string().default('A Successful Test on Novu from {{userName}}'),
    }),
  });
}, {
  payloadSchema: z.object({
    userName: z.string().default('John Doe'),
  }),
});`}
          />
          <HStack gap="50" className={css({ color: 'typography.text.secondary', mt: '12px' })}>
            <IconOutlineMenuBook />
            <a href="https://docs.novu.co/workflow/introduction" target={'_blank'}>
              Learn more on building workflows
            </a>
          </HStack>
        </>
      ),
    },
    {
      title: 'Run the application server',
      content: () => <CodeSnippet command={`cd my-novu-app && npm run dev`} />,
    },
    {
      title: 'Run Novu Studio',
      content: () => (
        <TextElement>
          Novu Studio is used to preview your local workflows, inspect controls and trigger test workflows.
          <br />
          To Start Novu Studio, run the following command in your terminal:
          <br />
          <br />
          <CodeSnippet command={`npx novu@latest dev --port 4000`} />
          <HStack gap="50" className={css({ color: 'typography.text.secondary', mt: '12px' })}>
            <IconOutlineMenuBook />
            <a href="https://docs.novu.co/workflow/studio" target={'_blank'}>
              Learn more about Novu Studio
            </a>
          </HStack>
        </TextElement>
      ),
    },
    {
      title: 'Send a test notification',
      content: () => (
        <TextElement>
          Once the Studio is open, navigate to the 'test-workflow' tab and click on the 'Send test' button.
        </TextElement>
      ),
    },
  ];
}

export function SetupTab() {
  const [activeGuide, setActiveGuide] = useState('nextjs');
  const segment = useSegment();
  const handleGuideClick = (guideId) => {
    setActiveGuide(guideId);

    segment.track('Get Started - Framework Select', { framework: guideId });
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
