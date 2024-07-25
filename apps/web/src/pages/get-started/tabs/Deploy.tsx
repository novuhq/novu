import { GitHubLogo, VercelLogo, NetlifyLogo } from '../Logos';
import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { Button } from '@mantine/core';
import { css } from '@novu/novui/css';
import { IconCode } from '@novu/novui/icons';

import { OnboardingStepsTimeline } from '../OnboardingSteps';
import { CodeSnippet } from '../legacy-onboarding/components/CodeSnippet';
import { useEnvironment } from '../../../hooks/useEnvironment';
import { CodeEditor } from '../CodeBlock';
import { TextElement } from '../TextElement';

export const deployGuides = [
  {
    id: 'github',
    title: 'Actions',
    logo: GitHubLogo,
    steps: [
      {
        title: 'Push to a Git repository',
        content: () => {
          return (
            <>
              <TextElement>
                Novu works as part of your existing CI/CD flow, so first, make sure that your application is pushed to a
                remote Git repository.
              </TextElement>
            </>
          );
        },
      },
      {
        title: 'Add a new GitHub Action workflow',
        content: () => {
          return (
            <>
              <TextElement>
                Novu can be synced and updated automatically, on each push to your GitHub repository.
                <br />
                We offer a GitHub action that you can use to sync your workflows.
              </TextElement>

              <br />
              <br />
              <CodeEditor
                language="yaml"
                height="350px"
                readonly
                setCode={() => {}}
                code={`name: Deploy Workflow State to Novu
on:
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Sync State to Novu
        uses: novuhq/actions-novu-sync@v2
        with:
          # The secret key used to authenticate with Novu Cloud
          # To get the secret key, go to https://web.novu.co/api-keys.
          secret-key: \${{ secrets.NOVU_SECRET_KEY }}

          # The publicly available endpoint hosting the bridge application
          # where notification entities (eg. workflows, topics) are defined.
          bridge-url: \${{ secrets.NOVU_BRIDGE_URL }}
                `}
              />
            </>
          );
        },
      },
    ],
  },
  {
    id: 'vercel',
    title: 'Vercel',
    logo: VercelLogo,
    steps: [
      {
        title: 'Push to a Git repository',
        content: () => {
          return (
            <>
              <TextElement>
                Novu works as part of your existing CI/CD flow, so first, make sure that your application is pushed to a
                remote Git repository.
              </TextElement>
            </>
          );
        },
      },
      {
        title: 'Publish to Vercel',
        content: () => {
          return (
            <>
              <TextElement>
                Publish your application on Vercel following their guide, so that the Novu bridge can be accessed from
                the internet.
              </TextElement>
            </>
          );
        },
      },
    ],
  },
  {
    id: 'netlify',
    title: 'Netlify',
    logo: NetlifyLogo,
    steps: [
      {
        title: 'Push to a Git repository',
        content: () => {
          return (
            <>
              <TextElement>
                Novu works as part of your existing CI/CD flow, so first, make sure that your application is pushed to a
                remote Git repository.
              </TextElement>
            </>
          );
        },
      },
      {
        title: 'Publish to Netlify',
        content: () => {
          return (
            <>
              <TextElement>
                Publish your application on Netlify following their guide, so that the Novu bridge can be accessed from
                the internet.
              </TextElement>
            </>
          );
        },
      },
    ],
  },
  {
    id: 'code',
    title: 'CLI',
    logo: IconCode,
    steps: [
      {
        title: 'Push to a Git repository',
        content: () => {
          return (
            <>
              <TextElement>
                Novu works as part of your existing CI/CD flow, so first, make sure that your application is pushed to a
                remote Git repository.
              </TextElement>
            </>
          );
        },
      },
      {
        title: 'Publish the application',
        content: () => {
          return (
            <>
              <TextElement>
                Publish your application on your hosting provider, so that the Novu bridge can be accessed from the
                internet.
              </TextElement>
            </>
          );
        },
      },
      {
        title: 'Manually Sync',
        content: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { environment } = useEnvironment();

          return (
            <TextElement>
              Sync manually with our CLI from any other CI/CD pipeline like GitLab CI, Jenkins, AWS CodePipeline, etc.
              <CodeSnippet
                command={`npx novu@latest sync --bridge-url <YOUR_DEPLOYED_URL> --secret-key=${
                  (environment as any)?.apiKeys[0].key
                }`}
              />
            </TextElement>
          );
        },
      },
    ],
  },
];

export function DeployTab() {
  const [activeGuide, setActiveGuide] = useState('github');
  const handleGuideClick = (guideId) => {
    setActiveGuide(guideId);
  };

  const activeGuideData = deployGuides.find((guide) => guide.id === activeGuide);

  return (
    <>
      <CardButtonGroupWrapper>
        {deployGuides.map((guide) => (
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
