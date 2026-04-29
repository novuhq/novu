import { Box, Text, useInput } from 'ink';
import React from 'react';
import type { UserIntent } from '../../types';
import { glyphs, theme } from '../theme';

interface IntakeProps {
  width: number;
  hasNovuFramework: boolean;
  isActive: boolean;
  onComplete: (intent: UserIntent) => void;
  onCancel: () => void;
}

interface GoalChoice {
  value: UserIntent['goal'];
  title: string;
}

interface ModeChoice {
  value: 'framework' | 'dashboard';
  title: string;
}

const GOAL_CHOICES: GoalChoice[] = [
  { value: 'integrate-novu', title: 'Integrate Novu to my app' },
  { value: 'inbox', title: 'Integrate Inbox' },
  { value: 'transactional', title: 'Create transactional workflows' },
];

const MODE_CHOICES: ModeChoice[] = [
  { value: 'framework', title: 'Code-first with @novu/framework' },
  { value: 'dashboard', title: 'No-code, via the Novu Dashboard' },
];

const GOAL_QUESTION = 'What do you want Wizard to build?';
const MODE_QUESTION = 'How would you like to author workflows?';

const GOALS_REQUIRING_MODE: UserIntent['goal'][] = ['integrate-novu', 'transactional'];

type Step = 'goal' | 'mode';

export function Intake({ width, hasNovuFramework, isActive, onComplete, onCancel }: IntakeProps): React.ReactElement {
  const [step, setStep] = React.useState<Step>('goal');
  const [goalIdx, setGoalIdx] = React.useState(0);
  const [modeIdx, setModeIdx] = React.useState(0);
  const [pickedGoal, setPickedGoal] = React.useState<GoalChoice | null>(null);

  function complete(goal: GoalChoice, mode: ModeChoice | null) {
    onComplete({
      goal: goal.value,
      summary: deriveSummary(goal, mode),
      preferDashboardWorkflows: mode?.value === 'dashboard',
      notes: '',
    });
  }

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'c') {
        onCancel();

        return;
      }

      if (step === 'goal') {
        if (key.upArrow) {
          setGoalIdx((idx) => Math.max(0, idx - 1));

          return;
        }
        if (key.downArrow) {
          setGoalIdx((idx) => Math.min(GOAL_CHOICES.length - 1, idx + 1));

          return;
        }
        if (key.return) {
          const goal = GOAL_CHOICES[goalIdx];
          setPickedGoal(goal);

          if (!GOALS_REQUIRING_MODE.includes(goal.value)) {
            complete(goal, null);

            return;
          }
          if (hasNovuFramework) {
            complete(goal, MODE_CHOICES[0]);

            return;
          }
          setStep('mode');
        }

        return;
      }

      if (step === 'mode') {
        if (key.upArrow) {
          setModeIdx((idx) => Math.max(0, idx - 1));

          return;
        }
        if (key.downArrow) {
          setModeIdx((idx) => Math.min(MODE_CHOICES.length - 1, idx + 1));

          return;
        }
        if (key.escape) {
          setStep('goal');
          setPickedGoal(null);

          return;
        }
        if (key.return && pickedGoal) {
          complete(pickedGoal, MODE_CHOICES[modeIdx]);
        }
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column" width={width} paddingX={1}>
      <Box marginTop={1}>
        <Text bold color={theme.brand}>
          Tell Wizard what to build
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {step === 'goal' ? (
          <ActiveChoiceQuestion
            question={GOAL_QUESTION}
            choices={GOAL_CHOICES.map((choice) => choice.title)}
            activeIdx={goalIdx}
          />
        ) : (
          <CollapsedAnswer question={GOAL_QUESTION} answer={pickedGoal?.title ?? ''} />
        )}

        {step === 'mode' ? (
          <Box marginTop={1}>
            <ActiveChoiceQuestion
              question={MODE_QUESTION}
              choices={MODE_CHOICES.map((choice) => choice.title)}
              activeIdx={modeIdx}
            />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

interface ActiveChoiceQuestionProps {
  question: string;
  choices: string[];
  activeIdx: number;
}

function ActiveChoiceQuestion({ question, choices, activeIdx }: ActiveChoiceQuestionProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>{question}</Text>
      <Box flexDirection="column" marginTop={0}>
        {choices.map((title, idx) => (
          <ChoiceRow key={title} active={idx === activeIdx} title={title} />
        ))}
      </Box>
    </Box>
  );
}

interface CollapsedAnswerProps {
  question: string;
  answer: string;
}

function CollapsedAnswer({ question, answer }: CollapsedAnswerProps): React.ReactElement {
  return (
    <Box>
      <Text dimColor>{`${question} `}</Text>
      <Text color={theme.ok}>{`${glyphs.ok} `}</Text>
      <Text color={theme.ok}>{answer}</Text>
    </Box>
  );
}

interface ChoiceRowProps {
  active: boolean;
  title: string;
}

function ChoiceRow({ active, title }: ChoiceRowProps): React.ReactElement {
  const marker = active ? '\u276f' : ' ';
  const color = active ? theme.brand : theme.muted;

  return (
    <Box>
      <Text color={color}>{`${marker} `}</Text>
      <Text bold={active} color={active ? theme.brand : undefined}>
        {title}
      </Text>
    </Box>
  );
}

function deriveSummary(goal: GoalChoice, mode: ModeChoice | null): string {
  if (!mode) return `${goal.title}.`;
  const modeLabel = mode.value === 'dashboard' ? 'Dashboard workflows (MCP)' : 'code-first workflows (@novu/framework)';

  if (goal.value === 'integrate-novu') {
    return `Integrate Novu end-to-end (Inbox + workflows + triggers) using ${modeLabel}.`;
  }

  return `${goal.title} using ${modeLabel}.`;
}
