import { zodResolver } from '@hookform/resolvers/zod';
import { useLayoutEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiLinkM, RiPencilFill } from 'react-icons/ri';
import * as z from 'zod';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchBridgeHealthCheck } from '@/hooks/use-fetch-bridge-health-check';
import { useUpdateBridgeUrl } from '@/hooks/use-update-bridge-url';
import { useValidateBridgeUrl } from '@/hooks/use-validate-bridge-url';
import { ConnectionStatus } from '@/utils/types';
import { cn } from '@/utils/ui';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '../primitives/popover';

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
                status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.LOADING
                  ? 'bg-destructive'
                  : 'bg-success [--pulse-color:var(--success)]'
              )}
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
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-1 p-5">
                <FormField
                  control={control}
                  name="bridgeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Bridge Endpoint URL</FormLabel>
                      <FormControl>
                        <Input leadingIcon={RiLinkM} id="bridgeUrl" {...field} />
                      </FormControl>
                      <FormMessage>URL (e.g., https://your.api.com/api/novu)</FormMessage>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3">
                <a
                  href="https://docs.novu.co/concepts/endpoint#bridge-endpoint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs"
                >
                  Learn more
                </a>
                <Button
                  type="submit"
                  variant="primary"
                  mode="filled"
                  size="xs"
                  isLoading={isUpdatingBridgeUrl}
                  disabled={!isDirty || isValidatingBridgeUrl || isUpdatingBridgeUrl}
                >
                  Update endpoint
                </Button>
              </div>
            </form>
          </Form>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
