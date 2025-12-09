import { WidgetType } from '@uiw/react-codemirror';
import { CSSProperties } from 'react';
import { getFirstFilterAndItsArgs, validateEnhancedDigestFilters } from '@/components/variable/utils';

export const DEFAULT_VARIABLE_PILL_HEIGHT = 18;

export class VariablePillWidget extends WidgetType {
  private clickHandler: (e: MouseEvent) => void;
  private tooltipElement: HTMLElement | null = null;

  constructor(
    private variableName: string,
    private fullVariableName: string,
    private start: number,
    private end: number,
    private filters: string[],
    private onSelect?: (value: string, from: number, to: number) => void,
    private isDigestEventsVariable?: (variableName: string) => boolean,
    private isNotInSchema: boolean = false,
    private errorMessage?: string
  ) {
    super();

    this.clickHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // setTimeout is used to defer the selection until after CodeMirror's own click handling
      // This prevents race conditions where our selection might be immediately cleared by the editor
      setTimeout(() => {
        this.onSelect?.(this.fullVariableName, this.start, this.end);
      }, 0);
    };
  }

  getDisplayVariableName(): string {
    if (!this.variableName) return '';
    const variableParts = this.variableName.split('.');

    return variableParts.length >= 3 ? '..' + variableParts.slice(-2).join('.') : this.variableName;
  }

  createBeforeStyles(): CSSProperties {
    return {
      width: 'calc(1rem - 2px)',
      minWidth: 'calc(1rem - 2px)',
      height: 'calc(1rem - 2px)',
      backgroundImage: this.isNotInSchema ? `url("/images/error-warning-line.svg")` : `url("/images/code.svg")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: 'contain',
      color: this.isNotInSchema ? 'hsl(var(--error-base))' : undefined,
    };
  }

  createAfterStyles(): CSSProperties {
    return {
      width: '0.275em',
      height: '0.275em',
      backgroundColor: 'hsl(var(--feature-base))',
      borderRadius: '100%',
      marginLeft: '3px',
    };
  }

  createPillStyles(): CSSProperties {
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
      height: `${DEFAULT_VARIABLE_PILL_HEIGHT}px`,
      lineHeight: 'inherit',
      fontSize: 'max(12px, calc(1em - 3px))',
      cursor: 'pointer',
      position: 'relative',
      verticalAlign: 'middle',
      fontWeight: '500',
      boxSizing: 'border-box',
    };
  }

  createContentStyles(): CSSProperties {
    return {
      lineHeight: '1.2',
      color: 'hsl(var(--text-sub))',
      maxWidth: '24ch',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',

      // @ts-expect-error
      '-webkit-font-smoothing': 'antialiased',
      '-moz-osx-font-smoothing': 'grayscale',
    };
  }

  createFilterParentStyles(): CSSProperties {
    return {
      display: 'inline-flex',
      alignItems: 'center',
    };
  }

  createFilterStyles(): CSSProperties {
    return {
      lineHeight: '1.2',
      color: 'hsl(var(--text-soft))',

      // @ts-expect-error
      '-webkit-font-smoothing': 'antialiased',
      '-moz-osx-font-smoothing': 'grayscale',
    };
  }

  toDOM() {
    const span = document.createElement('span');
    const content = document.createElement('span');
    const before = document.createElement('span');

    const pillStyles = this.createPillStyles();
    Object.assign(span.style, pillStyles);

    const beforeStyles = this.createBeforeStyles();
    Object.assign(before.style, beforeStyles);

    const contentStyles = this.createContentStyles();
    Object.assign(content.style, contentStyles);

    content.textContent = this.getDisplayVariableName();
    content.title = this.variableName;

    span.setAttribute('data-variable', this.fullVariableName);
    span.setAttribute('data-start', this.start.toString());
    span.setAttribute('data-end', this.end.toString());
    span.setAttribute('data-display', this.variableName);

    span.appendChild(before);
    span.appendChild(content);

    span.addEventListener('mousedown', this.clickHandler);

    const hasIssues = !!this.getVariableIssues();

    if (hasIssues) {
      before.style.color = 'hsl(var(--error-base))';
      before.style.backgroundImage = `url("/images/error-warning-line.svg")`;
    } else if (this.isNotInSchema) {
      before.style.color = 'hsl(var(--error-base))';
    }

    this.renderFilters(span);

    span.addEventListener('mouseenter', () => {
      if (!this.tooltipElement) {
        const issues = this.getVariableIssues();

        if (issues) {
          this.tooltipElement = this.renderTooltip({
            parent: span,
            content: `${issues.name}: ${issues.message}`,
            type: 'error',
          });
          this.tooltipElement.setAttribute('data-state', 'open');
        } else if (this.isNotInSchema && this.errorMessage) {
          this.tooltipElement = this.renderTooltip({
            parent: span,
            content: this.errorMessage,
            type: 'error',
          });
          this.tooltipElement.setAttribute('data-state', 'open');
        }
      }

      if (hasIssues) {
        span.style.backgroundColor = 'hsl(var(--error-base) / 0.025)';
      } else if (this.isNotInSchema) {
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

  renderFilters(parent: HTMLElement) {
    if (!this.filters?.length) return;

    const { finalParam, firstFilterName } = getFirstFilterAndItsArgs(this.filters);

    if (this.filters?.length > 0) {
      const filterSpan = document.createElement('span');
      const filterNameSpan = document.createElement('span');
      filterNameSpan.textContent = `| ${firstFilterName}`;
      Object.assign(filterNameSpan.style, this.createFilterStyles());
      filterSpan.appendChild(filterNameSpan);

      if (this.filters.length === 1 && finalParam) {
        const argsSpan = document.createElement('span');
        filterNameSpan.textContent = `| ${firstFilterName}: `;
        argsSpan.textContent = finalParam;
        argsSpan.title = finalParam;
        Object.assign(argsSpan.style, this.createContentStyles());
        filterSpan.appendChild(argsSpan);
      }

      if (this.filters.length > 1) {
        const countSpan = document.createElement('span');
        countSpan.textContent = `, +${this.filters.length - 1} more`;
        Object.assign(countSpan.style, { ...this.createFilterStyles(), fontStyle: 'italic' });
        filterSpan.appendChild(countSpan);

        countSpan.addEventListener('mouseenter', () => {
          if (!this.tooltipElement) {
            const otherFilterNames = this.filters
              .slice(1)
              .map((f) => f.split(':')[0].trim())
              .join(', ');
            this.tooltipElement = this.renderTooltip({
              parent: countSpan,
              prefix: 'Other filters: ',
              content: `${otherFilterNames}`,
              type: 'other',
            });
            this.tooltipElement.setAttribute('data-state', 'open');
          }
        });

        countSpan.addEventListener('mouseleave', () => {
          if (this.tooltipElement) {
            this.tooltipElement.setAttribute('data-state', 'closed');

            setTimeout(() => {
              this.destroyTooltip();
            }, 150);
          }
        });
      }

      parent.appendChild(filterSpan);
    }
  }

  renderTooltip({
    parent,
    prefix,
    content,
    type,
  }: {
    parent: HTMLElement;
    prefix?: string;
    content: string;
    type: 'error' | 'other' | 'warning';
  }) {
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
    } else if (type === 'warning') {
      innerContainer.textContent = content;
      tooltip.style.color = 'hsl(var(--warning-base))';
    } else {
      innerContainer.textContent = prefix ?? '';
      innerContainer.style.color = 'hsl(var(--text-soft))';
      const otherFilterNamesSpan = document.createElement('span');
      otherFilterNamesSpan.textContent = content;
      otherFilterNamesSpan.style.color = 'hsl(var(--feature))';
      innerContainer.appendChild(otherFilterNamesSpan);
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

  getVariableIssues() {
    if (this.isDigestEventsVariable && this.isDigestEventsVariable(this.variableName)) {
      const issues = validateEnhancedDigestFilters(this.filters);

      return issues;
    }

    return null;
  }

  /**
   * Determines if two VariablePillWidget instances are equal by comparing all their properties.
   * Used by CodeMirror to optimize re-rendering.
   */
  eq(other: VariablePillWidget) {
    return (
      other.fullVariableName === this.fullVariableName &&
      other.start === this.start &&
      other.end === this.end &&
      other.isNotInSchema === this.isNotInSchema &&
      other.errorMessage === this.errorMessage
    );
  }

  /**
   * Cleanup method called when the widget is being removed from the editor.
   * Removes event listeners to prevent memory leaks.
   */
  destroy(dom: HTMLElement) {
    this.destroyTooltip();
    dom.removeEventListener('mousedown', this.clickHandler);
  }

  /**
   * Controls whether CodeMirror should handle events on this widget.
   * Returns false to allow events to propagate normally.
   */
  ignoreEvent() {
    return false;
  }
}
