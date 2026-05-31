import { expect } from 'chai';
import {
  CONNECTION_RESULT_CSP,
  renderConnectionResultPage,
} from './connection-result-page';

describe('connection-result-page', () => {
  describe('CONNECTION_RESULT_CSP', () => {
    it('allows inline styles so the embedded <style> block is not blocked', () => {
      expect(CONNECTION_RESULT_CSP).to.match(/style-src[^;]*'unsafe-inline'/);
    });

    it('allows inline scripts so the postMessage shim and onclick handler are not blocked', () => {
      expect(CONNECTION_RESULT_CSP).to.match(/script-src[^;]*'unsafe-inline'/);
    });

    it("keeps default-src locked down to 'self'", () => {
      expect(CONNECTION_RESULT_CSP).to.match(/default-src 'self'/);
    });
  });

  describe('renderConnectionResultPage', () => {
    it('emits an inline <style> block that requires style-src unsafe-inline', () => {
      const html = renderConnectionResultPage({
        status: 'success',
        title: 'Connection complete',
        heading: "You're all set",
        message: 'Your workspace is connected and ready to use.',
      });

      expect(html).to.include('<style>');
      expect(html).to.include('</style>');
    });

    it('escapes user-controlled copy in heading and message', () => {
      const html = renderConnectionResultPage({
        status: 'error',
        title: 'Failed',
        heading: '<img src=x onerror=alert(1)>',
        message: '"oops" & <bad>',
      });

      expect(html).to.not.include('<img src=x onerror=alert(1)>');
      expect(html).to.include('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).to.include('&quot;oops&quot; &amp; &lt;bad&gt;');
    });

    it('embeds a postMessage shim only when a payload is provided', () => {
      const withPayload = renderConnectionResultPage({
        status: 'success',
        title: 't',
        heading: 'h',
        message: 'm',
        postMessagePayload: { type: 'novu-mcp-oauth-result', status: 'connected' },
      });
      const withoutPayload = renderConnectionResultPage({
        status: 'success',
        title: 't',
        heading: 'h',
        message: 'm',
      });

      expect(withPayload).to.include('window.opener.postMessage(');
      expect(withoutPayload).to.not.include('window.opener.postMessage(');
    });

    it('escapes </script> breakout sequences inside the postMessage JSON payload', () => {
      const html = renderConnectionResultPage({
        status: 'error',
        title: 't',
        heading: 'h',
        message: 'm',
        postMessagePayload: { reason: '</script><script>alert(1)</script>' },
      });

      expect(html).to.not.include('</script><script>alert(1)</script>');
      expect(html).to.include('\\u003c/script>');
    });
  });
});
