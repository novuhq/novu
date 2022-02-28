/* eslint no-undef: 0 */
/* eslint promise/param-names: 0 */
/* eslint-disable */
//
import iFrameResize from 'iframe-resizer';
import * as EventTypes from './shared/eventTypes';
import { UnmountedError, DomainVerificationError } from './shared/errors';
import { IFRAME_URL } from './shared/resources';
import { SHOW_WIDGET } from './shared/eventTypes';

const WEASL_WRAPPER_ID = 'notifire-container';
const IFRAME_ID = 'notifire-iframe-element';

class Notifire {
  public clientId: string | unknown;

  private debugMode: boolean;

  private onloadFunc: (b: any) => void;

  private unseenBadgeSelector: string = '';

  private domainAllowed: boolean;

  private selector: string = '';

  private iframe: HTMLIFrameElement | undefined;

  private widgetVisible = false;

  private listeners: { [key: string]: (data: any) => void } = {};

  constructor(onloadFunc = function () {}) {
    this.debugMode = false;
    this.onloadFunc = onloadFunc;
    this.domainAllowed = true;
    this.widgetVisible = false;
  }

  on = (name: string, cb: (data: any) => void) => {
    this.listeners[name] = cb;
  };

  init = (
    clientId: string,
    selector: string | { bellSelector: string; unseenBadgeSelector: string },
    options: { userId: string; lastName: string; firstName: string; email: string }
  ) => {
    const _scope = this;
    if (typeof selector === 'string') {
      this.selector = selector;
    } else {
      this.selector = selector.bellSelector;
      this.unseenBadgeSelector = selector.unseenBadgeSelector;
    }

    this.clientId = clientId;
    this.initializeIframe(clientId, options);
    this.mountIframe();
    const button = document.querySelector(this.selector) as HTMLButtonElement;
    if (button) {
      button.style.position = 'relative';
    }

    function positionIframe() {
      const button = document.querySelector(_scope.selector);
      if (!button) {
        return;
      }
      const pos = button.getClientRects()[0];
      if (!pos) {
        hideWidget();
        return;
      }

      const { left } = pos;
      const { top } = pos;
      const wrapper: any = document.querySelector('.wrapper-notifire-widget');

      let leftPosition = left - 265;
      if (leftPosition < 250) {
        leftPosition = left + 265;
      }

      wrapper.style.position = 'absolute';
      wrapper.style.left = `${leftPosition}px`;
      wrapper.style.top = `${top + 50}px`;
    }

    function hideWidget() {
      var elem = document.querySelector('.wrapper-notifire-widget') as HTMLBodyElement;

      if (elem) {
        elem.style.display = 'none';
      }
    }

    window.addEventListener('resize', () => {
      positionIframe();
    });

    window.addEventListener('click', (e: any) => {
      if (document.querySelector(this.selector)?.contains(e.target)) {
        this.widgetVisible = !this.widgetVisible;
        positionIframe();

        var elem = document.querySelector('.wrapper-notifire-widget') as HTMLBodyElement;

        if (elem) {
          elem.style.display = 'inline-block';
        }

        this.iframe?.contentWindow?.postMessage(
          {
            type: EventTypes.SHOW_WIDGET,
            value: {},
          },
          '*'
        );
      } else {
        hideWidget();
      }
    });
  };

  // PRIVATE METHODS
  ensureMounted = () => {
    if (!document.getElementById(IFRAME_ID)) {
      throw new UnmountedError('notifire.init needs to be called first');
    }
  };

  ensureAllowed = () => {
    if (!this.domainAllowed) {
      throw new DomainVerificationError(`${window.location.host} is not permitted to use client ID ${this.clientId}`);
    }
  };

  receiveMessage = (event: any) => {
    if (!!event && !!event.data && !!event.data.type) {
      // eslint-disable-next-line default-case
      switch (event.data.type) {
        case EventTypes.SET_COOKIE:
          document.cookie = event.data.value;
          break;
        case EventTypes.DOMAIN_NOT_ALLOWED:
          this.handleDomainNotAllowed();
          break;
        case EventTypes.BOOTSTRAP_DONE:
          this.handleBootstrapDone();
          break;
      }
    }
  };

  handleBootstrapDone = () => {
    const notifireApi = (window as any).notifire;
    notifireApi._c = (window as any).notifire._c;

    this.runPriorCalls();
    (window as any).notifire = notifireApi;
  };

  handleDomainNotAllowed = () => {
    this.domainAllowed = false;
  };

  initializeIframe = (clientId: string, options: any) => {
    if (!document.getElementById(IFRAME_ID)) {
      const iframe = document.createElement('iframe');
      iframe.onload = () => {
        (iFrameResize as any).iframeResize(
          {
            log: false,
            autoResize: true,
            onMessage: ({ message }: any) => {
              if (message.type === 'unseen_count_changed') {
                if (this.selector) {
                  const parentSel = document.querySelector(`${this.selector}`);
                  const sel = document.querySelector(`${this.selector} .ntf-counter`) as HTMLElement;
                  if (!sel) {
                    if (message.count) {
                      let span = document.createElement('span') as HTMLElement;
                      if (this.unseenBadgeSelector && document.querySelector(this.unseenBadgeSelector)) {
                        span = document.querySelector(this.unseenBadgeSelector) as HTMLElement;
                      }

                      span.classList.add('ntf-counter');
                      (span as any).style =
                        'top: 0; left: 10px; text-align: center; width: 13px; height: 13px; font-size: 9px; line-height: 14px; border-radius: 100%; color: white; background: red; overflow: hidden; z-index: 1000; display: inline-block; ' +
                        (span as any).style;

                      updateInnerTextCount(span, message.count);

                      if (parentSel) {
                        (parentSel as any).style.position = 'relative';
                        parentSel.appendChild(span);
                      }
                    }
                  } else if (!message.count) {
                    sel.remove();
                  } else if (sel) {
                    updateInnerTextCount(sel, message.count);
                  }
                }

                if (this.listeners.on_notification_count_change) {
                  this.listeners.on_notification_count_change(message.count);
                }
              } else if (message.type === 'url_change') {
                window.location.href = message.url;
              } else if (message.type === 'notification_click') {
                if (this.listeners.notification_click) {
                  this.listeners.notification_click(message.notification);
                }
              }
            },
            enablePublicMethods: true, // Enable methods within iframe hosted page
            heightCalculationMethod: 'max',
            widthCalculationMethod: 'max',
            sizeWidth: true,
          },
          `#${IFRAME_ID}`
        );

        this.iframe?.contentWindow?.postMessage(
          {
            type: EventTypes.INIT_IFRAME,
            value: {
              clientId: this.clientId,
              topHost: window.location.host,
              data: options,
            },
          },
          '*'
        );
      };

      iframe.src = `${IFRAME_URL}/${clientId}`;
      iframe.id = IFRAME_ID;
      iframe.style.border = 'none';
      (iframe as any).crossorigin = 'anonymous';
      this.iframe = iframe;
    }
  };

  runPriorCalls = () => {
    const allowedCalls: string[] = [];
    const priorCalls =
      window.notifire && window.notifire._c && typeof window.notifire._c === 'object' ? window.notifire._c : [];
    priorCalls.forEach((call: string[]) => {
      const method: any = call[0];
      const args = call[1];
      if (allowedCalls.includes(method)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (this[method as any] as any).apply(this, args);
      }
    });
    this.onloadFunc.call(window.notifire, window.notifire);
  };

  mountIframe = () => {
    if (!document.getElementById(IFRAME_ID) && this.iframe) {
      window.addEventListener('message', this.receiveMessage, false);

      const wrapper = document.createElement('div');

      wrapper.className = 'wrapper-notifire-widget';
      wrapper.style.display = 'none';
      wrapper.id = WEASL_WRAPPER_ID;
      (
        wrapper as any
      ).style = `z-index: ${Number.MAX_SAFE_INTEGER}; width: 0; height: 0; position: relative; display: none;`;
      wrapper.appendChild(this.iframe);
      document.body.appendChild(wrapper);
    }
  };
}

export default ((window: any) => {
  const onloadFunc =
    window.notifire && window.notifire.onload && typeof window.notifire.onload === 'function'
      ? window.notifire.onload
      : function () {};

  const initCall = window.notifire._c.find((call: string[]) => call[0] === 'init');
  const notifireApi: any = () => {};
  const notifire = new Notifire(onloadFunc);

  notifireApi.init = notifire.init;
  notifireApi.on = notifire.on;

  if (initCall) {
    // eslint-disable-next-line prefer-spread
    notifireApi[initCall[0]].apply(notifireApi, initCall[1]);

    const onCall = window.notifire._c.find((call: string[]) => call[0] === 'on');
    if (onCall) {
      notifireApi[onCall[0]].apply(notifireApi, onCall[1]);
    }
  } else {
    // eslint-disable-next-line no-param-reassign
    (window as any).notifire.init = notifire.init;

    // eslint-disable-next-line no-param-reassign
    (window as any).notifire.on = notifire.on;
  }
})(window);

function updateInnerTextCount(element: HTMLElement, count: number) {
  element.innerText = count > 99 ? '99+' : count.toString();
  if (count > 99) {
    (element as any).style.fontSize = '8px';
  }
}
