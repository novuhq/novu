import { useCallback, useEffect, useMemo } from 'react';
import { RiInformation2Line, RiRefreshLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchEnvironmentVariables } from '@/hooks/use-fetch-environment-variables';
import { buildRoute, ROUTES } from '@/utils/routes';
import { ACCORDION_STYLES } from './workflow-editor/steps/constants/preview-context.constants';
import { EditableJsonViewer } from './workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';
import { EnvData, EnvSectionProps } from './workflow-editor/steps/types/preview-context.types';

export function PreviewEnvSection({ schema, env, onUpdate }: EnvSectionProps) {
  const { currentEnvironment } = useEnvironment();
  const { data: envVariables = [] } = useFetchEnvironmentVariables({
    enabled: !!currentEnvironment?._id,
  });

  const variablesPageUrl = currentEnvironment?.slug
    ? buildRoute(ROUTES.VARIABLES, { environmentSlug: currentEnvironment.slug })
    : undefined;

  const serverEnvData = useMemo(() => {
    const keys = Object.keys(schema?.properties ?? {});

    return keys.reduce<EnvData>((acc, key) => {
      const variable = envVariables.find((v) => v.key === key);
      acc[key] = variable?.values.find((v) => v._environmentId === currentEnvironment?._id)?.value ?? '';

      return acc;
    }, {});
  }, [envVariables, currentEnvironment?._id, schema]);

  const schemaKeys = Object.keys(schema?.properties ?? {});

  useEffect(() => {
    if (Object.keys(env).length === 0 && Object.keys(serverEnvData).length > 0) {
      onUpdate('env', serverEnvData);
    }
  }, [env, serverEnvData, onUpdate]);

  const displayData = Object.keys(env).length > 0 ? env : serverEnvData;

  const handleChange = useCallback(
    (updatedData: unknown) => {
      onUpdate('env', (updatedData as EnvData) || {});
    },
    [onUpdate]
  );

  const handleReset = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUpdate('env', serverEnvData);
    },
    [onUpdate, serverEnvData]
  );

  return (
    <AccordionItem value="env" className={ACCORDION_STYLES.itemLast}>
      <AccordionTrigger
        className={ACCORDION_STYLES.trigger}
        rightSlot={
          <div className="mr-2 flex items-center gap-2">
            <Button
              onClick={handleReset}
              type="button"
              variant="secondary"
              mode="ghost"
              size="2xs"
              className="text-foreground-600 gap-1"
            >
              <RiRefreshLine className="h-3 w-3" />
              Reset defaults
            </Button>
          </div>
        }
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-0.5">
            Environment
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-foreground-400 inline-block hover:cursor-help">
                  <RiInformation2Line className="size-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Environment variables available via <code className="font-mono text-[10px]">{'{{env.KEY}}'}</code> in
                templates. Values are resolved server-side.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2">
        {schemaKeys.length > 0 ? (
          <>
            <EditableJsonViewer value={displayData} onChange={handleChange} className={ACCORDION_STYLES.jsonViewer} />
            <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
              <RiInformation2Line className="h-3 w-3 shrink-0" />
              <span>
                Changes here only affect the preview and won't be saved to environment variables.
                {variablesPageUrl && (
                  <>
                    {' '}
                    <Link to={variablesPageUrl} className="text-foreground-600 cursor-pointer font-medium">
                      Manage ↗
                    </Link>
                  </>
                )}
              </span>
            </div>
          </>
        ) : (
          <p className="text-text-disabled px-1 text-xs italic">No environment variables defined</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
