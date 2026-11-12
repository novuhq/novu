/**
 * How long a browser gets to hand a link to an installed app before the web address opens instead. Safari
 * still counts a new tab opened this soon after a click as the click's, so it doesn't block it.
 */
const FALLBACK_MS = 1_000;

/**
 * Opens an app's desktop app by its link, or its web address in a new tab when no desktop app answers. A page
 * can't ask whether an app is installed, but a browser that hands the link to one takes the focus off the
 * page: the web address opens only when the page still has it a moment later.
 *
 * Chrome hands the link over from the page itself. Safari and Firefox show an error for a link no app
 * answers, so they get it in a hidden frame instead.
 */
export function openDesktopApp(desktopUrl: string, webUrl: string): void {
  let handedOver = false;
  const handOver = () => {
    handedOver = true;
  };
  window.addEventListener('blur', handOver);
  document.addEventListener('visibilitychange', handOver);

  setTimeout(() => {
    window.removeEventListener('blur', handOver);
    document.removeEventListener('visibilitychange', handOver);
    if (!handedOver && document.hasFocus()) {
      window.open(webUrl, '_blank', 'noreferrer');
    }
  }, FALLBACK_MS);

  if (/\bChrom(e|ium)\//.test(navigator.userAgent)) {
    window.location.href = desktopUrl;

    return;
  }

  const frame = document.createElement('iframe');
  frame.hidden = true;
  frame.src = desktopUrl;
  document.body.append(frame);
  setTimeout(() => frame.remove(), FALLBACK_MS);
}
