import { RiSparklingLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
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

    navigate(`${buildRoute(ROUTES.DISPATCH_AGENTS, { environmentSlug })}?${params.toString()}`);
  };

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center px-2 py-1.5">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
          Start from a template
        </span>
      </div>
      <div className="bg-bg-white flex flex-wrap items-center gap-2 rounded-md p-3 shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        {AGENT_TEMPLATES.map((template) => (
          <button
            key={template.label}
            type="button"
            onClick={() => handleTemplateClick(template)}
            className="border-stroke-soft bg-bg-white text-text-strong hover:bg-bg-weak focus-visible:ring-stroke-strong-950 inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-label-xs font-medium leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <RiSparklingLine className="text-text-soft size-3.5" aria-hidden />
            <span>{template.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
