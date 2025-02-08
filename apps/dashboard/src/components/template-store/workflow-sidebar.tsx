import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { Calendar, Code2, ExternalLink, FileCode2, FileText, KeyRound, LayoutGrid, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildRoute, ROUTES } from '../../utils/routes';
import { Badge } from '../primitives/badge';
import { WorkflowMode } from './types';

interface WorkflowSidebarProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  mode: WorkflowMode;
}

interface SidebarButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  bgColor?: string;
  hasExternalLink?: boolean;
  beta?: boolean;
}

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.01 },
  tap: { scale: 0.99 },
};

const iconVariants = {
  initial: { rotate: 0 },
  hover: { rotate: 5 },
};

function SidebarButton({
  icon,
  label,
  onClick,
  isActive,
  bgColor = 'bg-blue-50',
  beta,
  hasExternalLink,
}: SidebarButtonProps) {
  const content = (
    <div className="flex items-center gap-3">
      <motion.div variants={iconVariants} className={`rounded-lg p-[5px] ${bgColor}`}>
        {icon}
      </motion.div>
      <span className="text-label-sm text-strong-950">{label}</span>
      {hasExternalLink && (
        <motion.div whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 300 }} className="ml-auto">
          <ExternalLink className="text-foreground-600 h-3 w-3" />
        </motion.div>
      )}
    </div>
  );

  return (
    <motion.button
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl border border-transparent p-1.5 transition-colors hover:cursor-pointer hover:bg-gray-100 ${
        isActive ? '!border-[#EEEFF1] bg-white' : ''
      }`}
    >
      <div className="flex w-full items-center gap-2">
        {content}{' '}
        {beta && (
          <Badge color="gray" size="sm">
            BETA
          </Badge>
        )}
      </div>
    </motion.button>
  );
}

const useCases = [
  {
    id: 'popular',
    icon: <LayoutGrid className="h-3 w-3 text-gray-700" />,
    label: 'Popular',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'billing',
    icon: <Calendar className="h-3 w-3 text-gray-700" />,
    label: 'Billing',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'authentication',
    icon: <KeyRound className="h-3 w-3 text-gray-700" />,
    label: 'Authentication',
    bgColor: 'bg-green-50',
  },
  {
    id: 'operational',
    icon: <Users className="h-3 w-3 text-gray-700" />,
    label: 'Operational',
    bgColor: 'bg-purple-50',
  },
] as const;

export function WorkflowSidebar({ selectedCategory, onCategorySelect, mode }: WorkflowSidebarProps) {
  const navigate = useNavigate();
  const { environmentSlug } = useParams();
  const track = useTelemetry();

  const handleCreateWorkflow = () => {
    track(TelemetryEvent.CREATE_WORKFLOW_CLICK);
    navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }));
  };

  const createOptions = [
    {
      icon: <FileText className="h-3 w-3 text-gray-700" />,
      label: 'Blank workflow',
      bgColor: 'bg-green-50',
      onClick: handleCreateWorkflow,
    },
    {
      icon: <Code2 className="h-3 w-3 text-gray-700" />,
      label: 'Code-based workflow',
      hasExternalLink: true,
      bgColor: 'bg-blue-50',
      onClick: () => window.open('https://docs.novu.co/framework/overview', '_blank'),
    },
  ];

  return (
    <div className="flex h-full w-[240px] flex-col gap-4 border-r p-2">
      <div className="flex flex-col gap-1">
        {createOptions.map((item, index) => (
          <SidebarButton
            key={index}
            icon={item.icon}
            label={item.label}
            onClick={item.onClick}
            bgColor={item.bgColor}
            hasExternalLink={item.hasExternalLink}
          />
        ))}
      </div>
      <section className="p-2">
        <div className="mb-2">
          <span className="text-subheading-2xs text-gray-500">EXPLORE</span>
        </div>

        <div className="flex flex-col gap-2">
          {useCases.map((item) => (
            <SidebarButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => onCategorySelect(item.id)}
              isActive={mode === WorkflowMode.TEMPLATES && selectedCategory === item.id}
              bgColor={item.bgColor}
            />
          ))}
        </div>
      </section>

      <div className="mt-auto p-3">
        <motion.div
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          className="border-stroke-soft flex flex-col items-start rounded-xl border bg-white p-3 hover:cursor-pointer"
          onClick={() => window.open('https://docs.novu.co/workflow/overview', '_blank')}
        >
          <div className="mb-1 flex items-center gap-1.5">
            <motion.div variants={iconVariants} className="rounded-lg bg-gray-50 p-1.5">
              <FileCode2 className="h-3 w-3 text-gray-700" />
            </motion.div>
            <span className="text-label-sm text-strong-950">Documentation</span>
          </div>

          <p className="text-paragraph-xs text-neutral-400">Find out more about how to best setup workflows</p>
        </motion.div>
      </div>
    </div>
  );
}
