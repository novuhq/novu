import { expect } from 'chai';
import {
  CONNECTION_RESULT_CSP,
  renderConnectionResultPage,
} from './connection-result-page';

describe('connection-result-page', () => {
  describe('CONNECTION_RESULT_CSP', () => {
    // Anchor the directive name to a `^`/`;` boundary so neither assertion can
    // pass via `script-src-attr` / `style-src-elem` if the bare directive ever
    // regresses.
    it('allows inline styles so the embedded <style> block is not blocked', () => {
      expect(CONNECTION_RESULT_CSP).to.match(/(?:^|;\s*)style-src\s+[^;]*'unsafe-inline'/);
    });

    it('allows inline scripts so the close-tab onclick handler is not blocked', () => {
      expect(CONNECTION_RESULT_CSP).to.match(/(?:^|;\s*)script-src\s+[^;]*'unsafe-inline'/);
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

    it('escapes user-controlled copy in title and footerNote', () => {
      const html = renderConnectionResultPage({
        status: 'success',
        title: '<script>alert(1)</script>',
        heading: 'h',
        message: 'm',
        footerNote: '"footer" & <note>',
      });

      expect(html).to.not.include('<script>alert(1)</script>');
      expect(html).to.include('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).to.include('&quot;footer&quot; &amp; &lt;note&gt;');
    });

    it('does not emit a window.opener.postMessage shim', () => {
      const html = renderConnectionResultPage({
        status: 'success',
        title: 't',
        heading: 'h',
        message: 'm',
      });

      expect(html).to.not.include('window.opener');
      expect(html).to.not.include('postMessage(');
      expect(html).to.not.include('<script>');
    });
  });
});
