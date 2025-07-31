import { zodResolver } from '@hookform/resolvers/zod';
import { PermissionsEnum } from '@novu/shared';
import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiLinkM, RiPencilFill } from 'react-icons/ri';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/primitives/form/form';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchBridgeHealthCheck } from '@/hooks/use-fetch-bridge-health-check';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useUpdateBridgeUrl } from '@/hooks/use-update-bridge-url';
import { useValidateBridgeUrl } from '@/hooks/use-validate-bridge-url';
import { ConnectionStatus } from '@/utils/types';
import { cn } from '@/utils/ui';
import { Input } from '../primitives/input';
import { PermissionButton } from '../primitives/permission-button';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '../primitives/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';

const formSchema = z.object({ bridgeUrl: z.string().url() });

export const EditBridgeUrlButton = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({ mode: 'onSubmit', resolver: zodResolver(formSchema) });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isDirty },
  } = form;
  const { currentEnvironment, setBridgeUrl } = useEnvironment();
  const { status, bridgeURL: envBridgeUrl } = useFetchBridgeHealthCheck();
  const { validateBridgeUrl, isPending: isValidatingBridgeUrl } = useValidateBridgeUrl();
  const { updateBridgeUrl, isPending: isUpdatingBridgeUrl } = useUpdateBridgeUrl();
  const has = useHasPermission();

  const isReadOnly = !has({ permission: PermissionsEnum.BRIDGE_WRITE });

  useLayoutEffect(() => {
    reset({ bridgeUrl: envBridgeUrl });
  }, [reset, envBridgeUrl]);

  const onSubmit = async ({ bridgeUrl }: z.infer<typeof formSchema>) => {
    const { isValid } = await validateBridgeUrl({ bridgeUrl });

    if (isValid) {
      await updateBridgeUrl({ url: bridgeUrl, environmentId: currentEnvironment?._id ?? '' });
      setBridgeUrl(bridgeUrl);
    } else {
      setError('bridgeUrl', { message: 'The provided URL is not the Novu Endpoint URL' });
    }
  };

  const getTooltipText = () => {
    if (status === ConnectionStatus.DISCONNECTED) {
      return 'Bridge endpoint disconnected';
    }

    if (status === ConnectionStatus.LOADING) {
      return 'Checking bridge endpoint...';
    }

    return 'Bridge endpoint connected';
  };

  if (!envBridgeUrl) return null;

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
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button className="text-foreground-600 flex h-5 w-5 items-center justify-center rounded-md text-xs leading-4 hover:bg-neutral-50 focus:bg-neutral-50">
              <div
                className={cn(
                  'relative flex size-4 items-center justify-center rounded-lg',
                  status === ConnectionStatus.DISCONNECTED ? 'bg-[rgba(220,38,38,0.1)]' : 'bg-[rgba(31,193,107,0.1)]'
                )}
              >
                <div
                  className={cn(
                    'flex size-full items-center justify-center rounded-lg p-1',
                    status === ConnectionStatus.DISCONNECTED
                      ? 'bg-[rgba(220,38,38,0.16)]'
                      : 'bg-[rgba(31,193,107,0.16)]'
                  )}
                >
                  <div
                    className={cn(
                      'size-1.5 rounded-[3px]',
                      status === ConnectionStatus.DISCONNECTED
                        ? 'animate-[pulse-shadow_1s_ease-in-out_infinite] bg-[rgba(220,38,38,0.6)] [--pulse-color:rgba(220,38,38,1)]'
                        : status === ConnectionStatus.LOADING
                          ? 'animate-[pulse-shadow_1s_ease-in-out_infinite] bg-[rgba(31,193,107,0.6)] [--pulse-color:rgba(31,193,107,1)]'
                          : 'bg-[rgba(31,193,107,0.6)]'
                    )}
                  />
                </div>
              </div>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{getTooltipText()}</TooltipContent>
      </Tooltip>
      <PopoverPortal>
        <PopoverContent className="w-[362px] p-0" side="bottom" align="end">
          <Form {...form}>
            <FormRoot onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-1 p-5">
                <FormField
                  control={control}
                  name="bridgeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Bridge Endpoint URL</FormLabel>
                      <FormControl>
                        <Input leadingIcon={RiLinkM} id="bridgeUrl" {...field} readOnly={isReadOnly} />
                      </FormControl>
                      <FormMessage>URL (e.g., https://your.api.com/api/novu)</FormMessage>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3">
                <a
                  href="https://docs.novu.co/platform/concepts/endpoint#bridge-endpoint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs"
                >
                  Learn more
                </a>

                <PermissionButton
                  permission={PermissionsEnum.BRIDGE_WRITE}
                  type="submit"
                  variant="primary"
                  mode="filled"
                  size="xs"
                  isLoading={isUpdatingBridgeUrl}
                  disabled={!isDirty || isValidatingBridgeUrl || isUpdatingBridgeUrl || isReadOnly}
                >
                  Update endpoint
                </PermissionButton>
              </div>
            </FormRoot>
          </Form>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
