import { UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';
import { css, cx } from '@novu/novui/css';
import { hstack } from '@novu/novui/patterns';
import { NavMenuFooter } from './NavMenuFooter';

export const RootNavMenuFooter: React.FC = () => {
  return (
    <NavMenuFooter
      className={cx(
        hstack(),
        css({
          display: 'flex !important',
          justifyContent: 'space-between',
          pt: '100',
        })
      )}
      testId="side-nav-root-footer"
    >
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://discord.novu.co"
        data-test-id="side-nav-bottom-link-support"
      >
        Support
      </a>
      <b>•</b>
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={`https://docs.novu.co${UTM_CAMPAIGN_QUERY_PARAM}`}
        data-test-id="side-nav-bottom-link-documentation"
      >
        Docs
      </a>
      <b>•</b>
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://github.com/novuhq/novu/issues/new/choose"
        data-test-id="side-nav-bottom-link-share-feedback"
      >
        Share Feedback
      </a>
    </NavMenuFooter>
  );
};
