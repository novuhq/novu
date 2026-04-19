import { DomainRouteTypeEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { RiAddLine, RiMore2Fill, RiRobot2Line, RiWebhookLine } from 'react-icons/ri';
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
import { useCreateRoute, useDeleteRoute, useUpdateRoute } from '@/hooks/use-domain-routes';
import { buildRoute, ROUTES } from '@/utils/routes';
import { RoutingEmptyIllustration } from './routing-empty-illustration';

type RouteFormState = {
  address: string;
  destination: string;
};

const DEFAULT_ROUTE_FORM: RouteFormState = {
  address: '',
  destination: '',
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
    if (!form.address.trim() || !form.destination.trim()) {
      showErrorToast('Address and destination are required.');
      return;
    }
    await onSave(form);
  };

  return (
    <TableRow>
      {/* Address */}
      <TableCell>
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
      <TableCell>
        <Select value={form.destination} onValueChange={(v) => setForm((f) => ({ ...f, destination: v }))}>
          <SelectTrigger className="h-7 w-56 text-sm" size="2xs">
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
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            mode="ghost"
            variant="secondary"
            className="size-7 text-success"
            onClick={handleSave}
            disabled={isSaving}
          >
            ✓
          </Button>
          <Button size="xs" mode="ghost" variant="secondary" className="text-destructive size-7" onClick={onCancel}>
            ✕
          </Button>
        </div>
      </TableCell>

      <TableCell className="w-12 text-right">
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
  const agentName = agentOptions.find((a) => a._id === route.destination)?.name ?? route.destination;

  return (
    <TableRow>
      <TableCell className="text-sm">
        {route.address}@{domainName}
      </TableCell>
      <TableCell className="text-foreground-600 max-w-[200px] truncate text-sm">
        <span className="flex items-center gap-1">
          <RiRobot2Line className="size-4 shrink-0" />
          {agentName}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-success text-sm">Active</span>
      </TableCell>
      <TableCell className="w-12 text-right">
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
            <code className="bg-neutral-alpha-100 rounded px-1 font-mono text-[11px]">email.inbound_received</code>{' '}
            event.
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
          All inbound emails fire the{' '}
          <code className="bg-neutral-alpha-100 rounded px-1 font-mono text-[11px]">email.inbound_received</code> event
          on your webhook endpoints.
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
  { domain },
  ref
) {
  const { currentEnvironment } = useEnvironment();
  const { data: agents = [] } = useAgents();
  const createRoute = useCreateRoute(domain._id);
  const updateRoute = useUpdateRoute(domain._id);
  const deleteRoute = useDeleteRoute(domain._id);

  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const startAdding = () => {
    setIsAdding(true);
    setEditingIndex(null);
  };

  useImperativeHandle(ref, () => ({ startAdding }));

  const handleCreate = async (values: RouteFormState) => {
    try {
      await createRoute.mutateAsync({ ...values, type: DomainRouteTypeEnum.AGENT });
      setIsAdding(false);
    } catch {
      showErrorToast('Failed to add route.');
    }
  };

  const handleUpdate = async (index: number, values: RouteFormState) => {
    try {
      await updateRoute.mutateAsync({ routeIndex: index, body: { ...values, type: DomainRouteTypeEnum.AGENT } });
      setEditingIndex(null);
    } catch {
      showErrorToast('Failed to update route.');
    }
  };

  const handleDelete = async (index: number) => {
    try {
      await deleteRoute.mutateAsync(index);
    } catch {
      showErrorToast('Failed to delete route.');
    }
  };

  const agentOptions = agents.map((a) => ({ _id: a._id, name: a.name, identifier: a.identifier }));

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {domain.routes.map((route, index) =>
              editingIndex === index ? (
                <InlineRouteForm
                  key={index}
                  domainName={domain.name}
                  initialValues={{ address: route.address, destination: route.destination }}
                  agentOptions={agentOptions}
                  onSave={(values) => handleUpdate(index, values)}
                  onCancel={() => setEditingIndex(null)}
                  isSaving={updateRoute.isPending}
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
                  isDeleting={deleteRoute.isPending}
                />
              )
            )}

            {isAdding && (
              <InlineRouteForm
                domainName={domain.name}
                agentOptions={agentOptions}
                onSave={handleCreate}
                onCancel={() => setIsAdding(false)}
                isSaving={createRoute.isPending}
              />
            )}

            {domain.routes.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-6">
                    <RoutingEmptyIllustration />
                    <div className="space-y-1 text-center">
                      <p className="text-foreground-600 text-sm font-medium">No routes configured</p>
                      <p className="text-foreground-400 text-xs">
                        Configure routes to route incoming emails to relevant agents.
                      </p>
                    </div>
                    <Button size="sm" mode="outline" variant="secondary" className="mx-auto" onClick={startAdding}>
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

      {currentEnvironment?.slug && (
        <WebhookForwardingBanner
          environmentSlug={currentEnvironment.slug}
          webhooksEnabled={!!currentEnvironment.webhookAppId}
        />
      )}
    </div>
  );
});
