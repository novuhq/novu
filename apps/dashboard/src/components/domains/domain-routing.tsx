import { DomainRouteTypeEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { RiAddLine, RiCloseLine, RiLightbulbFlashLine, RiMore2Fill, RiRobot2Line, RiWebhookLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { listAgents } from '@/api/agents';
import type { DomainResponse, DomainRouteResponse } from '@/api/domains';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
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
import { useEnvironment } from '@/context/environment/hooks';
import { useUpdateDomain } from '@/hooks/use-domain-routes';
import { buildRoute, ROUTES } from '@/utils/routes';
import { RoutingEmptyIllustration } from './routing-empty-illustration';

type RouteFormState = {
  address: string;
  destination: string;
  type: DomainRouteTypeEnum;
};

const DEFAULT_ROUTE_FORM: RouteFormState = {
  address: '',
  destination: '',
  type: DomainRouteTypeEnum.AGENT,
};

type DomainRoutingProps = {
  domain: DomainResponse;
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
};

function InlineRouteForm({
  domainName,
  initialValues = DEFAULT_ROUTE_FORM,
  agentOptions,
  onSave,
  onCancel,
  isSaving,
}: InlineRouteFormProps) {
  const [form, setForm] = useState<RouteFormState>(initialValues);

  const handleSave = async () => {
    if (!form.address.trim()) {
      showErrorToast('Address is required.');
      return;
    }
    if (form.type === DomainRouteTypeEnum.AGENT && !form.destination.trim()) {
      showErrorToast('An agent must be selected for agent routes.');
      return;
    }
    await onSave(form);
  };

  return (
    <TableRow className="[&>td]:border-0">
      {/* Address */}
      <TableCell className="px-3 py-4">
        <div className="flex items-center gap-1">
          <Input
            className="h-7 w-28 text-sm"
            placeholder="support"
            value={form.address}
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
                destination: v === DomainRouteTypeEnum.WEBHOOK ? '' : f.destination,
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
            value={form.destination}
            onValueChange={(v) => setForm((f) => ({ ...f, destination: v }))}
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
                <SelectItem key={agent._id} value={agent._id}>
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
          <Button
            size="xs"
            mode="ghost"
            variant="secondary"
            className="size-7 text-success"
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Save route"
          >
            ✓
          </Button>
          <Button
            size="xs"
            mode="ghost"
            variant="secondary"
            className="text-destructive size-7"
            onClick={onCancel}
            aria-label="Cancel editing"
          >
            ✕
          </Button>
        </div>
      </TableCell>

      <TableCell className="w-12 px-3 py-4 text-right">
        <CompactButton icon={RiMore2Fill} variant="ghost" className="h-8 w-8 p-0" disabled />
      </TableCell>
    </TableRow>
  );
}

type ExistingRouteRowProps = {
  route: DomainRouteResponse;
  routeIndex: number;
  domainName: string;
  agentOptions: Array<{ _id: string; name: string; identifier: string }>;
  onDelete: (index: number) => Promise<void>;
  onEdit: (index: number) => void;
  isDeleting: boolean;
};

function ExistingRouteRow({
  route,
  routeIndex,
  domainName,
  agentOptions,
  onDelete,
  onEdit,
  isDeleting,
}: ExistingRouteRowProps) {
  const isWebhook = route.type === DomainRouteTypeEnum.WEBHOOK;
  const agentName = isWebhook
    ? null
    : (agentOptions.find((a) => a._id === route.destination)?.name ?? route.destination);

  return (
    <TableRow className="[&>td]:border-0">
      <TableCell className="px-3 py-4 text-sm">
        {route.address}@{domainName}
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
            <DropdownMenuItem onSelect={() => onEdit(routeIndex)}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(routeIndex)}
              disabled={isDeleting}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
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

type WildcardRouteHintProps = {
  domainName: string;
  onConfigureClick: () => void;
  onDismiss: () => void;
};

function WildcardRouteHint({ domainName, onConfigureClick, onDismiss }: WildcardRouteHintProps) {
  return (
    <div className="border-information/20 bg-information/5 flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="flex items-center gap-2">
        <RiLightbulbFlashLine className="text-information size-4 shrink-0" />
        <p className="text-foreground-600 text-xs">
          <span className="text-foreground-950 font-medium">Tip:</span> Add a wildcard route{' '}
          <code className="bg-neutral-alpha-100 rounded px-1 font-mono text-[11px]">*@{domainName}</code> to forward
          every inbound email to your webhook endpoints.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onConfigureClick}
          className="text-foreground-900 hover:text-foreground-600 shrink-0 text-xs font-medium transition-colors"
        >
          Add wildcard route →
        </button>
        <CompactButton
          icon={RiCloseLine}
          variant="ghost"
          className="text-foreground-400 hover:text-foreground-600 h-6 w-6 p-0"
          onClick={onDismiss}
          aria-label="Dismiss tip"
        />
      </div>
    </div>
  );
}

export const DomainRouting = forwardRef<DomainRoutingHandle, DomainRoutingProps>(function DomainRouting(
  { domain },
  ref
) {
  const { currentEnvironment } = useEnvironment();
  const { data: agents = [] } = useAgents();
  const updateDomain = useUpdateDomain(domain._id);

  const [isAdding, setIsAdding] = useState(false);
  const [addInitialValues, setAddInitialValues] = useState<RouteFormState | undefined>(undefined);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isWildcardHintDismissed, setIsWildcardHintDismissed] = useState(false);

  const startAdding = (initialValues?: RouteFormState) => {
    setAddInitialValues(initialValues);
    setIsAdding(true);
    setEditingIndex(null);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setAddInitialValues(undefined);
  };

  useImperativeHandle(ref, () => ({ startAdding: () => startAdding() }));

  const handleCreate = async (values: RouteFormState) => {
    try {
      const newRoute: DomainRouteResponse = {
        address: values.address,
        type: values.type,
        ...(values.destination ? { destination: values.destination } : {}),
      };
      await updateDomain.mutateAsync({ routes: [...domain.routes, newRoute] });
      cancelAdding();
    } catch {
      showErrorToast('Failed to add route.');
    }
  };

  const handleUpdate = async (index: number, values: RouteFormState) => {
    try {
      const updatedRoute: DomainRouteResponse = {
        address: values.address,
        type: values.type,
        ...(values.destination ? { destination: values.destination } : {}),
      };
      const routes = domain.routes.map((r, idx) => (idx === index ? updatedRoute : r));
      await updateDomain.mutateAsync({ routes });
      setEditingIndex(null);
    } catch {
      showErrorToast('Failed to update route.');
    }
  };

  const handleDelete = async (index: number) => {
    try {
      const routes = domain.routes.filter((_, idx) => idx !== index);
      await updateDomain.mutateAsync({ routes });
    } catch {
      showErrorToast('Failed to delete route.');
    }
  };

  const agentOptions = agents.map((a) => ({ _id: a._id, name: a.name, identifier: a.identifier }));
  const hasWebhookRoute = domain.routes.some((route) => route.type === DomainRouteTypeEnum.WEBHOOK);
  const hasWildcardWebhookRoute = domain.routes.some(
    (route) => route.address === '*' && route.type === DomainRouteTypeEnum.WEBHOOK
  );
  const shouldShowWildcardHint = !isWildcardHintDismissed && hasWebhookRoute && !hasWildcardWebhookRoute && !isAdding;
  const isEmpty = domain.routes.length === 0 && !isAdding;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white p-3">
        <Table containerClassname="rounded-none border-0 shadow-none overflow-visible">
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
            {domain.routes.map((route, index) =>
              editingIndex === index ? (
                <InlineRouteForm
                  key={index}
                  domainName={domain.name}
                  initialValues={{ address: route.address, destination: route.destination ?? '', type: route.type }}
                  agentOptions={agentOptions}
                  onSave={(values) => handleUpdate(index, values)}
                  onCancel={() => setEditingIndex(null)}
                  isSaving={updateDomain.isPending}
                />
              ) : (
                <ExistingRouteRow
                  key={index}
                  route={route}
                  routeIndex={index}
                  domainName={domain.name}
                  agentOptions={agentOptions}
                  onDelete={handleDelete}
                  onEdit={setEditingIndex}
                  isDeleting={updateDomain.isPending}
                />
              )
            )}

            {isAdding && (
              <InlineRouteForm
                domainName={domain.name}
                initialValues={addInitialValues}
                agentOptions={agentOptions}
                onSave={handleCreate}
                onCancel={cancelAdding}
                isSaving={updateDomain.isPending}
              />
            )}

            {domain.routes.length === 0 && !isAdding && (
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
                    <Button
                      size="sm"
                      mode="outline"
                      variant="secondary"
                      className="mx-auto"
                      onClick={() => startAdding()}
                    >
                      <RiAddLine className="size-4" />
                      Add new route
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AnimatePresence initial={false}>
        {shouldShowWildcardHint && (
          <motion.div
            key="wildcard-route-hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <WildcardRouteHint
              domainName={domain.name}
              onConfigureClick={() => startAdding({ address: '*', destination: '', type: DomainRouteTypeEnum.WEBHOOK })}
              onDismiss={() => setIsWildcardHintDismissed(true)}
            />
          </motion.div>
        )}
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
    </div>
  );
});
