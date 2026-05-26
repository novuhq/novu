import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ApexDomainMxWarning } from '@/components/domains/apex-domain-mx-warning';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/primitives/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateDomain } from '@/hooks/use-domains';
import { DOMAIN_NAME_PATTERN, isApexInboundDomain } from '@/utils/inbound-domain';
import { buildRoute, ROUTES } from '@/utils/routes';

type AddDomainFormData = {
  name: string;
};

type AddDomainDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_PLACEHOLDER = 'inbound.acme.com';

export function AddDomainDialog({ open, onOpenChange }: AddDomainDialogProps) {
  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const createDomain = useCreateDomain();
  const [isPending, setIsPending] = useState(false);

  const domainPlaceholder = useMemo(() => {
    const emailDomain = currentUser?.email?.split('@')[1];

    if (!emailDomain || ['gmail.com', 'yahoo.com', 'hotmail.com'].includes(emailDomain)) {
      return DEFAULT_PLACEHOLDER;
    }

    return 'inbound.' + emailDomain;
  }, [currentUser?.email]);

  const form = useForm<AddDomainFormData>({
    defaultValues: { name: '' },
  });
  const domainName = form.watch('name');
  const showApexDomainWarning = isApexInboundDomain(domainName);

  const onSubmit = async (data: AddDomainFormData) => {
    setIsPending(true);
    try {
      const domain = await createDomain.mutateAsync({ name: data.name });
      onOpenChange(false);
      form.reset();

      if (currentEnvironment?.slug) {
        navigate(
          buildRoute(ROUTES.DOMAIN_DETAIL, {
            environmentSlug: currentEnvironment.slug,
            domain: domain.name,
          })
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create domain';
      showErrorToast(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add domain</DialogTitle>
          <DialogDescription>
            Connect a domain receive inbound email on your own domain and route each address to a webhook or an agent.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{
                required: 'Domain name is required',
                pattern: {
                  value: DOMAIN_NAME_PATTERN,
                  message: 'Enter a valid domain name (e.g. example.com)',
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder={domainPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showApexDomainWarning && <ApexDomainMxWarning />}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Setting up...' : 'Setup domain'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
