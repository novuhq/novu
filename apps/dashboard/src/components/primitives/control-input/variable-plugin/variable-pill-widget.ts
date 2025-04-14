import { WidgetType } from '@uiw/react-codemirror';
import { CSSProperties } from 'react';

export class VariablePillWidget extends WidgetType {
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    private variableName: string,
    private fullVariableName: string,
    private start: number,
    private end: number,
    private filters: string[],
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

  createBeforeStyles(): CSSProperties {
    return {
      width: 'calc(1em - 2px)',
      minWidth: 'calc(1em - 2px)',
      height: 'calc(1em)',
      backgroundImage: `url("/images/code.svg")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundSize: 'contain',
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
      height: '16px',
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

    // Stores the complete variable expression including any filters
    span.setAttribute('data-variable', this.fullVariableName);

    span.setAttribute('data-start', this.start.toString());
    span.setAttribute('data-end', this.end.toString());

    // Contains the clean variable name shown to the user
    span.setAttribute('data-display', this.variableName);

    span.appendChild(before);
    span.appendChild(content);

    if (this.filters?.length === 1) {
      const filterSpan = document.createElement('span');
      const filterParts = this.filters[0].split(/:(.+)/); // Split into filter name and arguments

      const filterNameSpan = document.createElement('span');
      filterNameSpan.textContent = ` | ${filterParts[0]}`;
      Object.assign(filterNameSpan.style, this.createFilterStyles());
      filterSpan.appendChild(filterNameSpan);

      if (filterParts[1]) {
        const argsSpan = document.createElement('span');
        argsSpan.textContent = `: ${filterParts[1]}`;
        Object.assign(argsSpan.style, this.createContentStyles());
        filterSpan.appendChild(argsSpan);
      }

      span.appendChild(filterSpan);
    } else if (this.filters?.length > 1) {
      const filterSpan = document.createElement('span');

      const filterParts = this.filters[0].split(/:(.+)/); // Split into filter name and arguments

      const filterNameSpan = document.createElement('span');
      filterNameSpan.textContent = ` | ${filterParts[0]}`;
      Object.assign(filterNameSpan.style, this.createFilterStyles());
      filterSpan.appendChild(filterNameSpan);

      if (filterParts[1]) {
        const argsSpan = document.createElement('span');
        argsSpan.textContent = `: ${filterParts[1]}`;
        Object.assign(argsSpan.style, this.createContentStyles());
        filterSpan.appendChild(argsSpan);
      }

      const countSpan = document.createElement('span');
      countSpan.textContent = ` +${this.filters.length - 1} more`;
      Object.assign(countSpan.style, { ...this.createFilterStyles(), fontStyle: 'italic' });
      filterSpan.appendChild(countSpan);

      span.appendChild(filterSpan);
    }

    span.addEventListener('mousedown', this.clickHandler);

    return span;
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
