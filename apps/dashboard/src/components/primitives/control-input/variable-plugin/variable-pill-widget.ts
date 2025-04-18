import { extractIssuesFromVariable, getFirstFilterAndItsArgs } from '@/components/variable/utils';
import { WidgetType } from '@uiw/react-codemirror';
import { CSSProperties } from 'react';

export class VariablePillWidget extends WidgetType {
  private clickHandler: (e: MouseEvent) => void;
  private tooltipElement: HTMLElement | null = null;

  constructor(
    private variableName: string,
    private fullVariableName: string,
    private start: number,
    private end: number,
    private filters: string[],
    private isEnhancedDigestEnabled: boolean,
    private onSelect?: (value: string, from: number, to: number) => void
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
      width: '1em',
      minWidth: 'calc(1em - 2px)',
      height: '1em',
      backgroundImage: `url("/images/code.svg")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: 'contain',
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
      padding: '0.125rem 0.375rem',
      margin: '0',
      fontFamily: 'var(--font-code)',
      display: 'inline-flex',
      alignItems: 'center',
      height: '20px',
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
      lineHeight: 'calc(1em - 2px)',
      color: 'hsl(var(--text-sub))',

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      '-webkit-font-smoothing': 'antialiased',
      '-moz-osx-font-smoothing': 'grayscale',
    };
  }

  createFilterStyles(): CSSProperties {
    return {
      color: 'hsl(var(--text-soft))',

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      '-webkit-font-smoothing': 'antialiased',
      '-moz-osx-font-smoothing': 'grayscale',
    };
  }

  toDOM() {
    const span = document.createElement('span');
    const content = document.createElement('span');
    content.textContent = this.variableName;
    const before = document.createElement('span');

    const pillStyles = this.createPillStyles();
    Object.assign(span.style, pillStyles);

    const beforeStyles = this.createBeforeStyles();
    Object.assign(before.style, beforeStyles);

    const contentStyles = this.createContentStyles();
    Object.assign(content.style, contentStyles);

    span.setAttribute('data-variable', this.fullVariableName);
    span.setAttribute('data-start', this.start.toString());
    span.setAttribute('data-end', this.end.toString());
    span.setAttribute('data-display', this.variableName);

    span.appendChild(before);
    span.appendChild(content);

    span.addEventListener('mousedown', this.clickHandler);

    if (this.isEnhancedDigestEnabled) {
      content.textContent = this.getDisplayVariableName();

      const hasIssues = this.getVariableIssues().length > 0;

      if (hasIssues) {
        before.style.color = 'hsl(var(--error-base))';
        before.style.backgroundImage = `url("/images/error-warning-line.svg")`;
      }

      this.renderFilters(span);

      span.addEventListener('mouseenter', () => {
        if (!this.tooltipElement) {
          this.tooltipElement = this.renderTooltip(span);
        }

        if (hasIssues) {
          span.style.backgroundColor = 'hsl(var(--error-base) / 0.025)';
        }
      });

      span.addEventListener('mouseleave', () => {
        if (this.tooltipElement) {
          document.body.removeChild(this.tooltipElement);
          this.tooltipElement = null;
        }

        span.style.backgroundColor = 'hsl(var(--bg-white))';
      });
    } else {
      if (this.filters?.length) {
        const after = document.createElement('span');
        const afterStyles = this.createAfterStyles();
        Object.assign(after.style, afterStyles);
        span.appendChild(after);
      }
    }

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

      if (this.filters.length === 1) {
        const argsSpan = document.createElement('span');
        argsSpan.textContent = finalParam;
        Object.assign(argsSpan.style, this.createContentStyles());
        filterSpan.appendChild(argsSpan);
      }

      if (this.filters.length > 1) {
        const countSpan = document.createElement('span');
        countSpan.textContent = `, +${this.filters.length - 1} more`;
        Object.assign(countSpan.style, { ...this.createFilterStyles(), fontStyle: 'italic' });
        filterSpan.appendChild(countSpan);
      }

      parent.appendChild(filterSpan);
    }
  }

  renderTooltip(parent: HTMLElement) {
    const tooltip = document.createElement('div');
    tooltip.className = 'border-bg-soft bg-bg-weak border p-0.5 shadow-sm rounded-md';

    const innerContainer = document.createElement('div');
    innerContainer.className = 'border-stroke-soft/70 text-label-2xs rounded-sm border bg-white p-1';
    tooltip.appendChild(innerContainer);

    const issues = this.getVariableIssues();

    if (this.filters && this.filters.length > 0) {
      tooltip.style.position = 'fixed';
      tooltip.style.zIndex = '9999';

      const rect = parent.getBoundingClientRect();
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.top - 32}px`;

      if (issues.length > 0) {
        const firstIssue = issues[0];
        innerContainer.textContent = `${firstIssue.filterName} is missing a value.`;
        tooltip.style.color = 'hsl(var(--error-base))';
        document.body.appendChild(tooltip);
        return tooltip;
      } else if (this.filters.length > 1) {
        const otherFilterNames = this.filters
          .slice(1)
          .map((f) => f.split(':')[0].trim())
          .join(', ');
        innerContainer.textContent = 'Other filters: ';
        innerContainer.style.color = 'hsl(var(--text-soft))';
        const otherFilterNamesSpan = document.createElement('span');
        otherFilterNamesSpan.textContent = otherFilterNames;
        otherFilterNamesSpan.style.color = 'hsl(var(--feature))';
        innerContainer.appendChild(otherFilterNamesSpan);
        // tooltip.style.color = 'hsl(var(--feature))';
        document.body.appendChild(tooltip);
        return tooltip;
      }
    }

    return null;
  }

  getVariableIssues() {
    const issues = extractIssuesFromVariable(this.filters, this.isEnhancedDigestEnabled);

    return issues;
  }

  /**
   * Determines if two VariablePillWidget instances are equal by comparing all their properties.
   * Used by CodeMirror to optimize re-rendering.
   */
  eq(other: VariablePillWidget) {
    return other.fullVariableName === this.fullVariableName && other.start === this.start && other.end === this.end;
  }

  /**
   * Cleanup method called when the widget is being removed from the editor.
   * Removes event listeners to prevent memory leaks.
   */
  destroy(dom: HTMLElement) {
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
