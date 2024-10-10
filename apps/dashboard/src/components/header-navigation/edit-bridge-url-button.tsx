import { useLayoutEffect, useState } from 'react';
import { RiLinkM, RiPencilFill } from 'react-icons/ri';
import { PopoverPortal } from '@radix-ui/react-popover';
import { SubmitHandler, useForm } from 'react-hook-form';
// eslint-disable-next-line
// @ts-ignore
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { cn } from '@/utils/ui';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { Button } from '../primitives/button';
import { Input, InputField, InputGroup, InputHint, InputLabel } from '../primitives/input';
import { useBridgeHealthCheck, useUpdateBridgeUrl, useValidateBridgeUrl } from '@/hooks';
import { ConnectionStatus } from '@/utils/types';
import { useEnvironment } from '@/context/environment/hooks';

type FormFields = {
  bridgeUrl: string;
};

const schema = z.object({ bridgeUrl: z.string().url() });

export const EditBridgeUrlButton = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { isDirty, errors },
  } = useForm<FormFields>({ mode: 'onSubmit', resolver: zodResolver(schema) });
  const { currentEnvironment, setBridgeUrl } = useEnvironment();
  const { status, bridgeURL: envBridgeUrl } = useBridgeHealthCheck();
  const { validateBridgeUrl, isLoading: isValidatingBridgeUrl } = useValidateBridgeUrl();
  const { updateBridgeUrl, isLoading: isUpdatingBridgeUrl } = useUpdateBridgeUrl();

  useLayoutEffect(() => {
    reset({ bridgeUrl: envBridgeUrl });
  }, [reset, envBridgeUrl]);

  const onSubmit: SubmitHandler<FormFields> = async ({ bridgeUrl }) => {
    const { isValid } = await validateBridgeUrl(bridgeUrl);
    if (isValid) {
      await updateBridgeUrl({ url: bridgeUrl, environmentId: currentEnvironment?._id ?? '' });
      setBridgeUrl(bridgeUrl);
    } else {
      setError('bridgeUrl', { message: 'The provided URL is not the Novu Endpoint URL' });
    }
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(newIsOpen) => {
        setIsPopoverOpen(newIsOpen);
        if (!newIsOpen && isDirty) {
          reset({ bridgeUrl: envBridgeUrl });
        }
      }}
    >
      <PopoverTrigger asChild>
        <button className="text-foreground-600 flex h-6 items-center gap-2 rounded-md border border-neutral-200 text-xs leading-4 hover:bg-neutral-50 focus:bg-neutral-50">
          <div className="flex items-center gap-2 px-1.5 py-1">
            <span
              className={cn(
                'relative size-1.5 animate-[pulse-shadow_1s_ease-in-out_infinite] rounded-full',
                status === ConnectionStatus.DISCONNECTED ? 'bg-destructive' : 'bg-success'
              )}
              style={
                {
                  '--pulse-color': status === ConnectionStatus.DISCONNECTED ? 'var(--destructive)' : 'var(--success)',
                } as React.CSSProperties
              }
            />
            <span>Local Studio</span>
          </div>
          <span className="border-l border-neutral-200 p-1.5">
            <RiPencilFill className="size-[12px]" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent className="w-[362px] p-0" side="bottom" align="end">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-5">
              <div className="flex flex-col gap-1">
                <InputGroup>
                  <InputLabel htmlFor="bridgeUrl">Bridge Endpoint URL</InputLabel>
                  <InputField variant="xs" state={errors.bridgeUrl?.message ? 'error' : 'default'}>
                    <RiLinkM className="size-5 min-w-5" />
                    <Input id="bridgeUrl" {...register('bridgeUrl')} />
                  </InputField>
                  <InputHint state={errors.bridgeUrl?.message ? 'error' : 'default'}>
                    {errors.bridgeUrl?.message ?? 'Full path URL (e.g., https://your.api.com/api/novu)'}
                  </InputHint>
                </InputGroup>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3">
              <a
                href="https://docs.novu.co/concepts/endpoint#bridge-endpoint"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs"
              >
                How it works?
              </a>
              <Button
                type="submit"
                variant="primary"
                size="xs"
                disabled={!isDirty || isValidatingBridgeUrl || isUpdatingBridgeUrl}
              >
                Update endpoint
              </Button>
            </div>
          </form>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
