import { RiArrowRightSLine, RiSparklingLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { MagicWand } from '@/components/icons/magic-wand';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { AGENT_TEMPLATES, type AgentTemplate } from './agent-templates';

export function StartFromTemplateSection() {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  const handleTemplateClick = (template: AgentTemplate) => {
    const environmentSlug = currentEnvironment?.slug;

    if (!environmentSlug) return;

    const params = new URLSearchParams({
      create: '1',
      name: template.name,
      description: template.instructions,
    });

    navigate(`${buildRoute(ROUTES.CONNECT_AGENTS, { environmentSlug })}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col rounded-[10px] p-1">
      <div className="flex items-center px-2 py-1.5 gap-1">
        <MagicWand className="text-text-soft size-4" />
        <span className="text-text-soft font-code text-code-xs font-medium uppercase leading-4 tracking-wider">
          Start from a template
        </span>
      </div>
      <ul className="bg-bg-white divide-stroke-soft flex flex-col divide-y rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        {AGENT_TEMPLATES.map((template) => (
          <li key={template.label} className="first:rounded-t-md last:rounded-b-md">
            <button
              type="button"
              onClick={() => handleTemplateClick(template)}
              className="cursor-pointer hover:bg-bg-weak focus-visible:bg-bg-weak focus-visible:ring-stroke-strong group flex w-full items-center gap-2 rounded-md px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              <RiSparklingLine className="text-text-sub size-4 shrink-0" aria-hidden />
              <span className="text-text-sub text-label-sm flex-1 truncate font-medium">{template.name}</span>
              <RiArrowRightSLine
                className="text-text-soft size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
