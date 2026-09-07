import { WidgetType } from '@uiw/react-codemirror';
import { CSSProperties, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { RiErrorWarningLine } from 'react-icons/ri';
import { TranslateVariableIcon } from '@/components/icons/translate-variable';
import { formatDisplayKey } from './utils';

export const TRANSLATION_PILL_HEIGHT = 18;

export class TranslationPillWidget extends WidgetType {
  private clickHandler: (e: MouseEvent) => void;
  private tooltipElement: HTMLElement | null = null;

  constructor(
    private translationKey: string,
    private fullExpression: string,
    private from: number,
    private to: number,
    private onSelect?: (translationKey: string, from: number, to: number) => void,
    private hasError: boolean = false,
    private errorMessage?: string
  ) {
    super();

    this.clickHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setTimeout(() => {
        this.onSelect?.(this.translationKey, this.from, this.to);
      }, 0);
    };
  }

  private createPillStyles(): CSSProperties {
    return {
      backgroundColor: 'hsl(var(--bg-white))',
      color: 'inherit',
      border: '1px solid hsl(var(--stroke-soft))',
      borderRadius: 'var(--radius)',
      gap: '0.25rem',
      padding: '1px 6px',
      margin: '0',
      fontFamily: 'var(--font-code)',
      display: 'inline-flex',
      alignItems: 'center',
      height: `${TRANSLATION_PILL_HEIGHT}px`,
      lineHeight: 'inherit',
      fontSize: 'max(12px, calc(1em - 3px))',
      cursor: 'pointer',
      position: 'relative',
      verticalAlign: 'middle',
      fontWeight: '500',
      boxSizing: 'border-box',
    };
  }

  private createIconStyles(): CSSProperties {
    return {
      width: 'calc(1rem - 2px)',
      minWidth: 'calc(1rem - 2px)',
      height: 'calc(1rem - 2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  }

  private createContentStyles(): CSSProperties {
    return {
      lineHeight: '1.2',
      color: 'hsl(var(--text-sub))',
      maxWidth: '24ch',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    };
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-translation-pill';

    const icon = document.createElement('span');
    const content = document.createElement('span');

    Object.assign(span.style, this.createPillStyles());
    Object.assign(icon.style, this.createIconStyles());
    Object.assign(content.style, this.createContentStyles());

    const displayKey = formatDisplayKey(this.translationKey);
    content.textContent = displayKey;
    content.title =
      this.hasError && this.errorMessage
        ? `${this.translationKey}\n\nError: ${this.errorMessage}`
        : this.translationKey;

    span.setAttribute('data-translation-key', this.translationKey);
    span.setAttribute('data-start', this.from.toString());
    span.setAttribute('data-end', this.to.toString());
    span.setAttribute('data-has-error', this.hasError.toString());

    if (this.hasError && this.errorMessage) {
      span.setAttribute('data-error-message', this.errorMessage);
    }

    span.contentEditable = 'false';

    // Render the icon - use error icon if there's an error, otherwise use translate icon
    const root = createRoot(icon);

    if (this.hasError) {
      root.render(
        createElement(RiErrorWarningLine, {
          className: 'text-error-base size-3.5 min-w-3.5',
        })
      );
    } else {
      root.render(
        createElement(TranslateVariableIcon, {
          className: 'text-feature size-3.5 min-w-3.5',
        })
      );
    }

    span.appendChild(icon);
    span.appendChild(content);
    span.addEventListener('mousedown', this.clickHandler);

    // Add hover events for error tooltip
    span.addEventListener('mouseenter', () => {
      if (this.hasError && this.errorMessage && !this.tooltipElement) {
        this.tooltipElement = this.renderTooltip({
          parent: span,
          content: this.errorMessage,
          type: 'error',
        });
        this.tooltipElement.setAttribute('data-state', 'open');
      }

      if (this.hasError) {
        span.style.backgroundColor = 'hsl(var(--error-base) / 0.025)';
      }
    });

    span.addEventListener('mouseleave', () => {
      if (this.tooltipElement) {
        this.tooltipElement.setAttribute('data-state', 'closed');

        setTimeout(() => {
          this.destroyTooltip();
        }, 150);
      }

      span.style.backgroundColor = 'hsl(var(--bg-white))';
    });

    return span;
  }

  eq(other: TranslationPillWidget) {
    return (
      other.translationKey === this.translationKey &&
      other.fullExpression === this.fullExpression &&
      other.from === this.from &&
      other.to === this.to &&
      other.hasError === this.hasError &&
      other.errorMessage === this.errorMessage
    );
  }

  private renderTooltip({ parent, content, type }: { parent: HTMLElement; content: string; type: 'error' }) {
    const tooltip = document.createElement('div');
    tooltip.className =
      'border-bg-soft bg-bg-weak border p-0.5 shadow-sm rounded-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2';
    tooltip.setAttribute('data-state', 'closed');

    const innerContainer = document.createElement('div');
    innerContainer.className = 'border-stroke-soft/70 text-label-2xs rounded-sm border bg-white p-1';
    tooltip.appendChild(innerContainer);

    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '9999';

    const rect = parent.getBoundingClientRect();
    const tooltipWidth = 200; // Set an estimated width
    tooltip.style.left = `${rect.left + rect.width / 2 - tooltipWidth / 2}px`;
    tooltip.style.top = `${rect.top - 32}px`;
    document.body.appendChild(tooltip);

    // Apply the tooltip after it's in the DOM to get its actual width and trigger fade in
    setTimeout(() => {
      const tooltipRect = tooltip.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
      tooltip.classList.replace('opacity-0', 'opacity-100');
    }, 0);

    if (type === 'error') {
      innerContainer.textContent = content;
      tooltip.style.color = 'hsl(var(--error-base))';
    }

    return tooltip;
  }

  destroyTooltip() {
    if (this.tooltipElement) {
      this.tooltipElement.replaceChildren();
      document.body.removeChild(this.tooltipElement);
      this.tooltipElement = null;
    }
  }

  destroy(dom: HTMLElement) {
    this.destroyTooltip();
    dom.removeEventListener('mousedown', this.clickHandler);
  }

  ignoreEvent() {
    return false;
  }
}
