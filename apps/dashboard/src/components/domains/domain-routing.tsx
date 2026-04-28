import { DomainRouteTypeEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Fragment, forwardRef, useEffect, useId, useImperativeHandle, useState } from 'react';
import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiMore2Fill,
  RiRobot2Line,
  RiSendPlaneLine,
  RiWebhookLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { NovuApiError } from '@/api/api.client';
import { listAgents } from '@/api/agents';
import type { DomainResponse, DomainRouteResponse, TestDomainRouteResponse } from '@/api/domains';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Checkbox } from '@/components/primitives/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/primitives/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Input } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/primitives/table';
import { Textarea } from '@/components/primitives/textarea';
import { useEnvironment } from '@/context/environment/hooks';
import {
  useCreateDomainRoute,
  useDeleteDomainRoute,
  useFetchDomainRoute,
  useFetchDomainRoutes,
  useUpdateDomainRoute,
} from '@/hooks/use-domain-routes';
import { useTestDomainRoute } from '@/hooks/use-test-domain-route';
import { parseDomainMetadataJson } from '@/utils/domain-metadata';
import { buildRoute, ROUTES } from '@/utils/routes';
import { RoutingEmptyIllustration } from './routing-empty-illustration';

type RouteFormState = {
  address: string;
  agentId: string;
  type: DomainRouteTypeEnum;
  dataJson: string;
};

const DEFAULT_ROUTE_FORM: RouteFormState = {
  address: '',
  agentId: '',
  type: DomainRouteTypeEnum.AGENT,
  dataJson: '{}',
};

function getRouteErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof NovuApiError) {
    return error.message || fallback;
  }

  return fallback;
}

type DomainRoutingProps = {
  domain: DomainResponse;
  canWrite?: boolean;
};

export type DomainRoutingHandle = {
  startAdding: () => void;
};

function useAgents() {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: ['fetchAgents', currentEnvironment?._id],
    queryFn: () =>
      listAgents({
        // biome-ignore lint/style/noNonNullAssertion: enabled guard ensures currentEnvironment is defined
        environment: currentEnvironment!,
        limit: 50,
      }),
    enabled: !!currentEnvironment,
    select: (data) => data.data,
  });
}

type InlineRouteFormProps = {
  domainName: string;
  initialValues?: RouteFormState;
  agentOptions: Array<{ _id: string; name: string; identifier: string }>;
  onSave: (values: RouteFormState) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  isAddressLocked?: boolean;
};

function InlineRouteForm({
  domainName,
  initialValues = DEFAULT_ROUTE_FORM,
  agentOptions,
  onSave,
  onCancel,
  isSaving,
  isAddressLocked = false,
}: InlineRouteFormProps) {
  const [form, setForm] = useState<RouteFormState>(initialValues);
  const shouldReduceMotion = useReducedMotion();
  const tapAnimation = shouldReduceMotion || isSaving ? undefined : { scale: 0.94 };

  const handleSave = async () => {
    if (!form.address.trim()) {
      showErrorToast('Address is required.');

      return;
    }
    if (form.type === DomainRouteTypeEnum.AGENT && !form.agentId.trim()) {
      showErrorToast('An agent must be selected for agent routes.');

      return;
    }
    await onSave(form);
  };

  return (
    <>
      <TableRow className="[&>td]:border-0">
        {/* Address */}
        <TableCell className="px-3 py-4">
          <div className="flex items-center gap-1">
            <Input
              className="h-7 w-28 text-sm"
              placeholder="support"
              value={form.address}
              disabled={isAddressLocked}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
            <span className="text-foreground-400 shrink-0 text-xs">@{domainName}</span>
          </div>
        </TableCell>

        {/* Destination */}
        <TableCell className="px-3 py-4">
          <div className="flex items-center gap-2">
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  type: v as DomainRouteTypeEnum,
                  agentId: v === DomainRouteTypeEnum.WEBHOOK ? '' : f.agentId,
                }))
              }
            >
              <SelectTrigger className="h-7 w-28 text-sm" size="2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DomainRouteTypeEnum.AGENT}>Agent</SelectItem>
                <SelectItem value={DomainRouteTypeEnum.WEBHOOK}>Webhook</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={form.agentId}
              onValueChange={(v) => setForm((f) => ({ ...f, agentId: v }))}
              disabled={form.type !== DomainRouteTypeEnum.AGENT}
            >
              <SelectTrigger
                className={`h-7 w-40 text-sm ${form.type === DomainRouteTypeEnum.AGENT ? '' : 'invisible'}`}
                size="2xs"
                aria-hidden={form.type !== DomainRouteTypeEnum.AGENT}
                tabIndex={form.type === DomainRouteTypeEnum.AGENT ? undefined : -1}
              >
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agentOptions.map((agent) => (
                  <SelectItem key={agent._id} value={agent.identifier}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TableCell>

        {/* Actions */}
        <TableCell className="px-3 py-4">
          <div className="flex items-center gap-1">
            <motion.button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              whileTap={tapAnimation}
              transition={{ duration: 0.08 }}
              className="text-success hover:bg-success-lighter disabled:hover:bg-transparent disabled:text-foreground-400 flex size-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-stroke-strong focus-visible:ring-offset-1 disabled:cursor-not-allowed"
              aria-label="Save route"
            >
              <RiCheckLine className="size-4" />
            </motion.button>
            <motion.button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              whileTap={tapAnimation}
              transition={{ duration: 0.08 }}
              className="text-destructive hover:bg-error-lighter disabled:hover:bg-transparent disabled:text-foreground-400 flex size-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-stroke-strong focus-visible:ring-offset-1 disabled:cursor-not-allowed"
              aria-label="Cancel editing"
            >
              <RiCloseLine className="size-4" />
            </motion.button>
          </div>
        </TableCell>

        <TableCell className="w-12 px-3 py-4 text-right">
          <CompactButton icon={RiMore2Fill} variant="ghost" className="h-8 w-8 p-0" disabled />
        </TableCell>
      </TableRow>

      <TableRow className="[&>td]:border-0">
        <TableCell colSpan={4} className="space-y-1 px-3 pb-4 pt-0">
          <p className="text-foreground-500 text-2xs font-medium">Metadata (optional JSON)</p>
          <Textarea
            value={form.dataJson}
            onChange={(e) => setForm((f) => ({ ...f, dataJson: e.target.value }))}
            className="font-code text-code-xs min-h-[72px] resize-y"
            spellCheck={false}
            placeholder="{}"
          />
          <p className="text-foreground-400 text-2xs">
            String keys and string values only. Max 10 keys; 500 characters total.
          </p>
        </TableCell>
      </TableRow>
    </>
  );
}

type ExistingRouteRowProps = {
  route: DomainRouteResponse;
  domainName: string;
  agentOptions: Array<{ _id: string; name: string; identifier: string }>;
  onDelete: (address: string) => Promise<void>;
  onEdit: (address: string) => void;
  onSendTest: (route: DomainRouteResponse) => void;
  isDeleting: boolean;
  canWrite: boolean;
};

function ExistingRouteRow({
  route,
  domainName,
  agentOptions,
  onDelete,
  onEdit,
  onSendTest,
  isDeleting,
  canWrite,
}: ExistingRouteRowProps) {
  const isWebhook = route.type === DomainRouteTypeEnum.WEBHOOK;
  const isCatchAll = route.address === '*';
  const agentName = isWebhook ? null : (agentOptions.find((a) => a._id === route.agentId)?.name ?? route.agentId);
  const shouldReduceMotion = useReducedMotion();
  const catchAllInitial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 };
  const catchAllAnimate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 };

  return (
    <TableRow className="[&>td]:border-0">
      <TableCell className="px-3 py-4 text-sm">
        <div className="flex items-center gap-2">
          <span>
            {route.address}@{domainName}
          </span>
          {isCatchAll ? (
            <motion.span
              initial={catchAllInitial}
              animate={catchAllAnimate}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Badge variant="lighter" color="blue" size="sm">
                Catch-all
              </Badge>
            </motion.span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-foreground-600 max-w-[200px] truncate px-3 py-4 text-sm">
        {isWebhook ? (
          <span className="flex items-center gap-1">
            <RiWebhookLine className="size-4 shrink-0" />
            Webhook
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <RiRobot2Line className="size-4 shrink-0" />
            {agentName}
          </span>
        )}
      </TableCell>
      <TableCell className="px-3 py-4">
        <span className="text-success text-sm">Active</span>
      </TableCell>
      <TableCell className="w-12 px-3 py-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <CompactButton icon={RiMore2Fill} variant="ghost" className="h-8 w-8 p-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(route.address)} disabled={!canWrite}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSendTest(route)} disabled={!canWrite}>
              <span className="flex items-center gap-1.5">
                <RiSendPlaneLine className="size-3.5 shrink-0" />
                Send test
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(route.address)}
              disabled={!canWrite || isDeleting}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

type RouteTestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainName: string;
  route: DomainRouteResponse | null;
  mutation: ReturnType<typeof useTestDomainRoute>;
};

const DEFAULT_TEST_FORM = {
  fromAddress: 'tester@example.com',
  fromName: '',
  subject: 'Novu route test',
  text: 'Synthetic inbound message from Novu.',
};

function RouteTestDialog({ open, onOpenChange, domainName, route, mutation }: RouteTestDialogProps) {
  const dryRunFieldId = useId();
  const [fromAddress, setFromAddress] = useState(DEFAULT_TEST_FORM.fromAddress);
  const [fromName, setFromName] = useState(DEFAULT_TEST_FORM.fromName);
  const [subject, setSubject] = useState(DEFAULT_TEST_FORM.subject);
  const [text, setText] = useState(DEFAULT_TEST_FORM.text);
  const [dryRun, setDryRun] = useState(true);
  const [lastResult, setLastResult] = useState<TestDomainRouteResponse | null>(null);
  const routeId = route?._id;

  useEffect(() => {
    if (!open || !routeId) return;

    setFromAddress(DEFAULT_TEST_FORM.fromAddress);
    setFromName(DEFAULT_TEST_FORM.fromName);
    setSubject(DEFAULT_TEST_FORM.subject);
    setText(DEFAULT_TEST_FORM.text);
    setDryRun(true);
    setLastResult(null);
  }, [open, routeId]);

  const handleSubmit = async () => {
    if (!route) {
      return;
    }

    if (!fromAddress.trim()) {
      showErrorToast('From address is required.');

      return;
    }

    try {
      const result = await mutation.mutateAsync({
        address: route.address,
        body: {
          from: { address: fromAddress.trim(), name: fromName.trim() || undefined },
          subject: subject.trim() || 'Test',
          text: text.trim() || undefined,
          dryRun,
        },
      });

      setLastResult(result);

      if (!result.matched) {
        showErrorToast('No route matched for this address.');
      }
    } catch {
      showErrorToast('Route test failed.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send test</DialogTitle>
          <DialogDescription>
            Deliver a synthetic inbound through the same path as production. Enable dry run to preview only.
          </DialogDescription>
        </DialogHeader>

        <div className="text-foreground-600 space-y-3 text-xs">
          <p className="font-code text-code-xs text-foreground-900">
            {route ? `${route.address}@${domainName}` : ''}
          </p>

          <div className="grid gap-2">
            <p className="text-foreground-500 text-2xs font-medium uppercase tracking-wide">From email</p>
            <Input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} className="h-8 text-sm" />
          </div>

          <div className="grid gap-2">
            <p className="text-foreground-500 text-2xs font-medium uppercase tracking-wide">From name (optional)</p>
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} className="h-8 text-sm" />
          </div>

          <div className="grid gap-2">
            <p className="text-foreground-500 text-2xs font-medium uppercase tracking-wide">Subject</p>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 text-sm" />
          </div>

          <div className="grid gap-2">
            <p className="text-foreground-500 text-2xs font-medium uppercase tracking-wide">Text body</p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-code min-h-[80px] text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id={dryRunFieldId} checked={dryRun} onCheckedChange={(v) => setDryRun(v === true)} />
            <label htmlFor={dryRunFieldId} className="cursor-pointer">
              Dry run (preview payload without delivering)
            </label>
          </div>
        </div>

        {lastResult ? (
          <pre className="bg-bg-weak text-foreground-700 max-h-48 overflow-auto rounded-md border p-3 font-mono text-2xs">
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" mode="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit} isLoading={mutation.isPending}>
            Run test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AddRouteTypeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAddressRoute: () => void;
  onSelectCatchAllRoute: () => void;
  hasCatchAllRoute: boolean;
  isCatchAllRouteLoading: boolean;
};

function AddRouteTypeDialog({
  open,
  onOpenChange,
  onSelectAddressRoute,
  onSelectCatchAllRoute,
  hasCatchAllRoute,
  isCatchAllRouteLoading,
}: AddRouteTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add route</DialogTitle>
          <DialogDescription>Choose how inbound addresses should match this route.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={onSelectAddressRoute}
            className="hover:border-stroke-strong hover:bg-bg-weak rounded-lg border border-stroke-soft p-3 text-left transition-colors"
          >
            <span className="text-text-strong block text-label-sm font-medium">Address route</span>
            <span className="text-text-soft mt-1 block text-label-xs">
              Match one inbox address, like <span className="font-code">support@domain.com</span>.
            </span>
          </button>

          <button
            type="button"
            onClick={onSelectCatchAllRoute}
            disabled={hasCatchAllRoute || isCatchAllRouteLoading}
            className="hover:border-stroke-strong hover:bg-bg-weak disabled:bg-bg-weak disabled:text-text-disabled rounded-lg border border-stroke-soft p-3 text-left transition-colors disabled:cursor-not-allowed"
          >
            <span className="text-text-strong block text-label-sm font-medium">Wildcard route</span>
            <span className="text-text-soft mt-1 block text-label-xs">
              Match every unmatched address with <span className="font-code">*@domain.com</span>.
            </span>
            {hasCatchAllRoute ? (
              <span className="text-text-soft mt-2 block text-label-xs">A wildcard route already exists.</span>
            ) : null}
            {isCatchAllRouteLoading ? (
              <span className="text-text-soft mt-2 block text-label-xs">Checking existing wildcard route...</span>
            ) : null}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type WebhookForwardingBannerProps = {
  environmentSlug: string;
  webhooksEnabled: boolean;
};

function WebhookForwardingBanner({ environmentSlug, webhooksEnabled }: WebhookForwardingBannerProps) {
  const webhooksHref = buildRoute(webhooksEnabled ? ROUTES.WEBHOOKS_ENDPOINTS : ROUTES.WEBHOOKS, { environmentSlug });

  if (!webhooksEnabled) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3">
        <div className="flex items-center gap-2">
          <RiWebhookLine className="text-foreground-400 size-4 shrink-0" />
          <p className="text-foreground-600 text-xs">
            Enable webhooks to receive inbound emails via the{' '}
            <code className="bg-neutral-alpha-100 rounded px-1 font-mono text-[11px]">email.received</code> event.
          </p>
        </div>
        <Link
          to={webhooksHref}
          className="text-foreground-900 hover:text-foreground-600 shrink-0 text-xs font-medium transition-colors"
        >
          Enable Webhooks →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-neutral-alpha-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <RiWebhookLine className="text-foreground-400 size-4 shrink-0" />
        <p className="text-foreground-600 text-xs">
          Inbound emails with a webhook route fire the{' '}
          <code className="bg-neutral-alpha-100 rounded px-1 font-mono text-[11px]">email.received</code> event on your
          webhook endpoints.
        </p>
      </div>
      <Link
        to={webhooksHref}
        className="text-foreground-900 hover:text-foreground-600 shrink-0 text-xs font-medium transition-colors"
      >
        Configure Webhooks →
      </Link>
    </div>
  );
}

export const DomainRouting = forwardRef<DomainRoutingHandle, DomainRoutingProps>(function DomainRouting(
  { domain, canWrite = true },
  ref
) {
  const { currentEnvironment } = useEnvironment();
  const { data: agents = [] } = useAgents();
  const [cursor, setCursor] = useState<{ after?: string; before?: string }>({});
  const { data: routesResponse, isLoading: areRoutesLoading } = useFetchDomainRoutes(domain.name, {
    limit: 50,
    ...cursor,
  });
  const { data: catchAllRoute, isFetching: isCatchAllRouteFetching } = useFetchDomainRoute(domain.name, '*');
  const createDomainRoute = useCreateDomainRoute(domain.name);
  const updateDomainRoute = useUpdateDomainRoute(domain.name);
  const deleteDomainRoute = useDeleteDomainRoute(domain.name);
  const testDomainRoute = useTestDomainRoute(domain.name);

  const [isAdding, setIsAdding] = useState(false);
  const [addInitialValues, setAddInitialValues] = useState<RouteFormState | undefined>(undefined);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [testDialogRoute, setTestDialogRoute] = useState<DomainRouteResponse | null>(null);
  const [isAddRouteTypeDialogOpen, setIsAddRouteTypeDialogOpen] = useState(false);
  const routes = routesResponse?.data ?? [];
  const hasCatchAllRoute = Boolean(catchAllRoute) || routes.some((route) => route.address === '*');
  const isMutating = createDomainRoute.isPending || updateDomainRoute.isPending || deleteDomainRoute.isPending;

  const startAdding = (initialValues?: RouteFormState) => {
    if (!canWrite) {
      return;
    }

    setAddInitialValues(initialValues);
    setIsAdding(true);
    setEditingAddress(null);
  };

  const startAddingCatchAll = () => {
    startAdding({ address: '*', agentId: '', type: DomainRouteTypeEnum.WEBHOOK, dataJson: '{}' });
  };

  const openAddRouteTypeDialog = () => {
    if (!canWrite) {
      return;
    }

    setIsAddRouteTypeDialogOpen(true);
  };

  const handleSelectAddressRoute = () => {
    setIsAddRouteTypeDialogOpen(false);
    startAdding();
  };

  const handleSelectCatchAllRoute = () => {
    if (hasCatchAllRoute || isCatchAllRouteFetching) {
      return;
    }

    setIsAddRouteTypeDialogOpen(false);
    startAddingCatchAll();
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setAddInitialValues(undefined);
  };

  useImperativeHandle(ref, () => ({ startAdding: openAddRouteTypeDialog }));

  const handleCreate = async (values: RouteFormState) => {
    if (!canWrite) {
      return;
    }

    const parsed = parseDomainMetadataJson(values.dataJson);

    if (!parsed.ok) {
      showErrorToast(parsed.message);

      return;
    }

    try {
      await createDomainRoute.mutateAsync({
        address: values.address.trim().toLowerCase(),
        type: values.type,
        ...(values.agentId ? { agentId: values.agentId } : {}),
        data: parsed.data,
      });
      cancelAdding();
    } catch (error) {
      showErrorToast(getRouteErrorMessage(error, 'Failed to add route.'), 'Route creation failed');
    }
  };

  const handleUpdate = async (address: string, values: RouteFormState) => {
    if (!canWrite) {
      return;
    }

    const parsed = parseDomainMetadataJson(values.dataJson);

    if (!parsed.ok) {
      showErrorToast(parsed.message);

      return;
    }

    try {
      await updateDomainRoute.mutateAsync({
        address,
        body: {
          type: values.type,
          ...(values.agentId ? { agentId: values.agentId } : {}),
          data: parsed.data,
        },
      });
      setEditingAddress(null);
    } catch (error) {
      showErrorToast(getRouteErrorMessage(error, 'Failed to update route.'), 'Route update failed');
    }
  };

  const handleDelete = async (address: string) => {
    if (!canWrite) {
      return;
    }

    try {
      await deleteDomainRoute.mutateAsync(address);
    } catch (error) {
      showErrorToast(getRouteErrorMessage(error, 'Failed to delete route.'), 'Route deletion failed');
    }
  };

  const agentOptions = agents.map((a) => ({ _id: a._id, name: a.name, identifier: a.identifier }));
  const hasWebhookRoute = routes.some((route) => route.type === DomainRouteTypeEnum.WEBHOOK);
  const isEmpty = routes.length === 0 && !isAdding;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white p-3">
        <Table containerClassname="rounded-none border-0 shadow-none overflow-visible" isLoading={areRoutesLoading}>
          {!isEmpty && (
            <TableHeader className="shadow-none [&>tr>th]:bg-bg-weak [&>tr>th]:border-stroke-weak [&>tr>th]:border-y [&>tr>th:first-child]:rounded-l-lg [&>tr>th:first-child]:border-l [&>tr>th:last-child]:rounded-r-lg [&>tr>th:last-child]:border-r">
              <TableRow>
                <TableHead className="h-8 px-3 text-label-xs">Address</TableHead>
                <TableHead className="h-8 px-3 text-label-xs">Destination</TableHead>
                <TableHead className="h-8 px-3 text-label-xs">Status</TableHead>
                <TableHead className="h-8 px-3 text-label-xs w-12" />
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {routes.map((route) =>
              editingAddress === route.address ? (
                <Fragment key={route._id}>
                  <InlineRouteForm
                    domainName={domain.name}
                    initialValues={{
                      address: route.address,
                      agentId: agentOptions.find((a) => a._id === route.agentId)?.identifier ?? '',
                      type: route.type,
                      dataJson: JSON.stringify(route.data ?? {}, null, 2),
                    }}
                    agentOptions={agentOptions}
                    isAddressLocked
                    onSave={(values) => handleUpdate(route.address, values)}
                    onCancel={() => setEditingAddress(null)}
                    isSaving={isMutating}
                  />
                </Fragment>
              ) : (
                <ExistingRouteRow
                  key={route._id}
                  route={route}
                  domainName={domain.name}
                  agentOptions={agentOptions}
                  onDelete={handleDelete}
                  onEdit={setEditingAddress}
                  onSendTest={setTestDialogRoute}
                  isDeleting={isMutating}
                  canWrite={canWrite}
                />
              )
            )}

            {isAdding && (
              <InlineRouteForm
                key={addInitialValues ? `add-${addInitialValues.address}-${addInitialValues.type}` : 'add-default'}
                domainName={domain.name}
                initialValues={addInitialValues ?? DEFAULT_ROUTE_FORM}
                agentOptions={agentOptions}
                isAddressLocked={addInitialValues?.address === '*'}
                onSave={handleCreate}
                onCancel={cancelAdding}
                isSaving={isMutating}
              />
            )}

            {routes.length === 0 && !isAdding && !areRoutesLoading && (
              <TableRow className="[&>td]:border-0">
                <TableCell colSpan={4} className="px-3 py-16 text-center">
                  <div className="flex flex-col items-center gap-6">
                    <RoutingEmptyIllustration />
                    <div className="space-y-1 text-center">
                      <p className="text-foreground-600 text-sm font-medium">No routes configured</p>
                      <p className="text-foreground-400 text-xs">
                        Configure routes to route incoming emails to relevant agents.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        size="sm"
                        mode="outline"
                        variant="secondary"
                        onClick={openAddRouteTypeDialog}
                        disabled={!canWrite}
                      >
                        <RiAddLine className="size-4" />
                        Add new route
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {(routesResponse?.previous || routesResponse?.next) && (
        <div className="flex justify-end gap-2">
          <Button
            size="xs"
            mode="outline"
            variant="secondary"
            disabled={!routesResponse?.previous || areRoutesLoading}
            onClick={() => setCursor({ before: routesResponse?.previous ?? undefined })}
          >
            Previous
          </Button>
          <Button
            size="xs"
            mode="outline"
            variant="secondary"
            disabled={!routesResponse?.next || areRoutesLoading}
            onClick={() => setCursor({ after: routesResponse?.next ?? undefined })}
          >
            Next
          </Button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {hasWebhookRoute && currentEnvironment?.slug && (
          <motion.div
            key="webhook-forwarding-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <WebhookForwardingBanner
              environmentSlug={currentEnvironment.slug}
              webhooksEnabled={!!currentEnvironment.webhookAppId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <RouteTestDialog
        open={!!testDialogRoute}
        domainName={domain.name}
        route={testDialogRoute}
        mutation={testDomainRoute}
        onOpenChange={(open) => {
          if (!open) setTestDialogRoute(null);
        }}
      />

      <AddRouteTypeDialog
        open={isAddRouteTypeDialogOpen}
        onOpenChange={setIsAddRouteTypeDialogOpen}
        onSelectAddressRoute={handleSelectAddressRoute}
        onSelectCatchAllRoute={handleSelectCatchAllRoute}
        hasCatchAllRoute={hasCatchAllRoute}
        isCatchAllRouteLoading={isCatchAllRouteFetching}
      />
    </div>
  );
});
