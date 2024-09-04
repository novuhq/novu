import { motion } from 'framer-motion';
import { useState } from 'react';
import { IconCode } from '@novu/novui/icons';
import { GitHubLogo, VercelLogo, NetlifyLogo } from '../Logos';

import { OnboardingStepsTimeline } from '../OnboardingSteps';
import { CodeSnippet } from '../legacy-onboarding/components/CodeSnippet';
import { useEnvironment } from '../../../hooks/useEnvironment';
import { CodeEditor } from '../CodeBlock';
import { TextElement } from '../TextElement';
import { CardButton, CardButtonGroupWrapper } from './CardsButtonGroup';
import { useSegment } from '../../../components/providers/SegmentProvider';

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
                Novu works as part of your CI/CD flow, so first, make sure that your application is pushed to a remote
                Git repository, so that the GitHub action can be triggered.
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
                We offer a GitHub action that you can use to sync your workflows, on each push to the <code>
                  main
                </code>{' '}
                branch.
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
                Novu works as part of your CI/CD flow, so first, make sure that your application is pushed to a remote
                Git repository, so that a Vercel project can be connected.
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
                Publish your application to Vercel following their onboarding instructions, so that the Novu bridge can
                be accessed from the internet. We are currently working on a Vercel marketplace integration to
                streamline your process.
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
                Publish your application to Netlify following their onboarding instructions, so that the Novu bridge can
                be accessed from the internet. We are currently working on a Netlify marketplace integration to
                streamline your process.
              </TextElement>
            </>
          );
        },
      },
    ],
  },
  {
    id: 'cli',
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
              Sync manually with our CLI from any CI/CD pipeline like GitLab CI, Jenkins, AWS CodePipeline, etc.
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
  const segment = useSegment();

  const handleGuideClick = (guideId) => {
    setActiveGuide(guideId);

    segment.track('Get Started - Deploy Guide Select', { guide: guideId });
  };

  const activeGuideData = deployGuides.find((guide) => guide.id === activeGuide);

  return (
    <>
      <CardButtonGroupWrapper>
        {deployGuides.map((guide) => (
          <motion.div key={guide.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <CardButton id={guide.id} active={guide.id === activeGuide} onClick={() => handleGuideClick(guide.id)}>
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
