<script lang="ts">
  import { onMount } from 'svelte';
  import { Novu } from '@novu/js';
  import { buildSubscriber } from '@novu/js/internal';
  import type { InboxProps as JsInboxProps, NovuUI } from '@novu/js/ui';
  import type { ClientOptions, InboxProps } from './types';

  let {
    applicationIdentifier,
    subscriberId,
    subscriber,
    subscriberHash,
    contextHash,
    apiUrl,
    backendUrl,
    socketUrl,
    socketOptions,
    useCache,
    defaultSchedule,
    context,
    appearance,
    localization,
    tabs,
    preferencesFilter,
    preferenceGroups,
    preferencesSort,
    routerPush,
    open,
    renderBell,
    renderNotification,
    renderAvatar,
    renderSubject,
    renderBody,
    renderDefaultActions,
    renderCustomActions,
    onNotificationClick,
    onPrimaryActionClick,
    onSecondaryActionClick,
    placement,
    placementOffset,
  }: InboxProps = $props();

  type RuntimeState =
    | { status: 'idle' }
    | { status: 'ready'; clientOptions: ClientOptions; novu: Novu; novuUI: NovuUI }
    | { status: 'destroyed' };

  let mountElement: HTMLDivElement | undefined;

  function attachMountElement(element: HTMLDivElement) {
    mountElement = element;
  }
  let lifecycle = $state<'server' | 'client' | 'destroyed'>('server');
  let runtime: RuntimeState = { status: 'idle' };
  let uiReady = $state(false);
  let uiLoadError = $state<unknown>();
  let novuUIConstructor: typeof NovuUI | undefined;

  const getContainer = (element: HTMLDivElement): Node | undefined => {
    const root = element.getRootNode();

    return typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot ? root : undefined;
  };

  let subscriberValue = $derived.by(() => buildSubscriber({ subscriberId, subscriber }));
  let clientOptions = $derived.by(
    (): ClientOptions => ({
      applicationIdentifier: applicationIdentifier ?? '',
      subscriber: subscriberValue,
      subscriberHash,
      contextHash,
      apiUrl,
      backendUrl,
      socketUrl,
      socketOptions,
      useCache,
      defaultSchedule,
      context,
    })
  );

  let inboxRendererProps = $derived.by(
    (): JsInboxProps => {
      const commonProps = {
        open,
        renderBell,
        onNotificationClick,
        onPrimaryActionClick,
        onSecondaryActionClick,
        placement,
        placementOffset,
      };

      if (renderNotification) {
        return { ...commonProps, renderNotification };
      }

      return {
        ...commonProps,
        renderAvatar,
        renderSubject,
        renderBody,
        renderDefaultActions,
        renderCustomActions,
      };
    }
  );

  const sameClientOptions = (left: ClientOptions | undefined, right: ClientOptions): boolean => {
    if (!left) {
      return false;
    }

    return (
      left.applicationIdentifier === right.applicationIdentifier &&
      left.subscriber === right.subscriber &&
      left.subscriberHash === right.subscriberHash &&
      left.contextHash === right.contextHash &&
      left.apiUrl === right.apiUrl &&
      left.backendUrl === right.backendUrl &&
      left.socketUrl === right.socketUrl &&
      left.socketOptions === right.socketOptions &&
      left.useCache === right.useCache &&
      left.defaultSchedule === right.defaultSchedule &&
      left.context === right.context
    );
  };

  onMount(() => {
    let disposed = false;
    lifecycle = 'client';

    void import('@novu/js/ui').then(
      ({ NovuUI: LoadedNovuUI }) => {
        if (disposed) {
          return;
        }

        novuUIConstructor = LoadedNovuUI;
        uiReady = true;
      },
      (error: unknown) => {
        if (!disposed) {
          uiLoadError = error;
        }
      }
    );

    return () => {
      disposed = true;
      const currentRuntime = runtime;
      if (currentRuntime.status === 'ready' && mountElement) {
        currentRuntime.novuUI.unmountComponent(mountElement);
        currentRuntime.novuUI.unmount();
        void currentRuntime.novu.socket.disconnect();
      }
      runtime = { status: 'destroyed' };
      lifecycle = 'destroyed';
    };
  });

  $effect(() => {
    const nextClientOptions = clientOptions;
    if (uiLoadError) {
      throw uiLoadError;
    }

    if (lifecycle !== 'client' || !mountElement || !uiReady || !novuUIConstructor) {
      return;
    }

    const currentRuntime = runtime;
    let activeRuntime = currentRuntime;

    if (currentRuntime.status !== 'ready' || !sameClientOptions(currentRuntime.clientOptions, nextClientOptions)) {
      const nextNovu = new Novu(nextClientOptions);

      if (currentRuntime.status === 'ready') {
        void currentRuntime.novu.socket.disconnect();
        currentRuntime.novuUI.updateNovu(nextNovu);
        currentRuntime.novuUI.updateOptions(nextClientOptions);
        activeRuntime = {
          status: 'ready',
          clientOptions: nextClientOptions,
          novu: nextNovu,
          novuUI: currentRuntime.novuUI,
        };
      } else {
        activeRuntime = {
          status: 'ready',
          clientOptions: nextClientOptions,
          novu: nextNovu,
          novuUI: new novuUIConstructor({
            options: nextClientOptions,
            appearance,
            localization,
            tabs,
            preferencesFilter,
            preferenceGroups,
            preferencesSort,
            routerPush,
            novu: nextNovu,
            container: getContainer(mountElement),
          }),
        };
      }

      runtime = activeRuntime;
    }

    if (activeRuntime.status !== 'ready') {
      return;
    }

    const currentNovuUI = activeRuntime.novuUI;
    currentNovuUI.updateAppearance(appearance);
    currentNovuUI.updateLocalization(localization);
    currentNovuUI.updateTabs(tabs);
    currentNovuUI.updatePreferencesFilter(preferencesFilter);
    currentNovuUI.updatePreferenceGroups(preferenceGroups);
    currentNovuUI.updatePreferencesSort(preferencesSort);
    currentNovuUI.updateRouterPush(routerPush);
    currentNovuUI.mountComponent({
      name: 'Inbox',
      element: mountElement,
      props: inboxRendererProps,
    });
  });
</script>

<div {@attach attachMountElement}></div>
