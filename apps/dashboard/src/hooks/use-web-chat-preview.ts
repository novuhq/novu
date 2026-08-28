import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { AGENT_DETAILS_DEFAULT_TAB, buildRoute, WEB_CHAT_PREVIEW_PARAM } from '@/utils/routes';

export function useWebChatPreview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentEnvironment } = useEnvironment();
  const agentRoutes = useAgentRoutes();
  const isOpen = searchParams.get(WEB_CHAT_PREVIEW_PARAM) === '1';

  const openPreview = useCallback(
    (agentIdentifier: string) => {
      const params = new URLSearchParams(location.search);
      params.set(WEB_CHAT_PREVIEW_PARAM, '1');
      const query = params.toString();
      const onThisAgent =
        location.pathname.includes(`/agents/${agentIdentifier}`) ||
        location.pathname.includes(`/agents/${encodeURIComponent(agentIdentifier)}`);

      if (onThisAgent) {
        setSearchParams(params, { replace: false });
        return;
      }

      if (!currentEnvironment?.slug) {
        return;
      }

      void navigate(
        `${buildRoute(agentRoutes.detailsTab, {
          environmentSlug: currentEnvironment.slug,
          agentIdentifier: encodeURIComponent(agentIdentifier),
          agentTab: AGENT_DETAILS_DEFAULT_TAB,
        })}${query ? `?${query}` : ''}`
      );
    },
    [agentRoutes.detailsTab, currentEnvironment?.slug, location.pathname, location.search, navigate, setSearchParams]
  );

  const closePreview = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(WEB_CHAT_PREVIEW_PARAM);

        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const setPreviewOpen = useCallback(
    (open: boolean) => {
      if (open) {
        return;
      }

      closePreview();
    },
    [closePreview]
  );

  return { isOpen, openPreview, closePreview, setPreviewOpen };
}
