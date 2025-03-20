import { CSSProperties } from 'react';
import { WidgetType } from '@uiw/react-codemirror';

export class VariablePillWidget extends WidgetType {
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    private variableName: string,
    private fullVariableName: string,
    private start: number,
    private end: number,
    private hasFilters: boolean,
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
      height: 'calc(1em - 2px)',
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
      backgroundColor: 'hsl(var(--bg-weak))',
      color: 'hsl(var(--text-sub))',
      border: '1px solid hsl(var(--stroke-soft))',
      borderRadius: '0.5rem',
      gap: '4px',
      padding: '2px 6px',
      margin: 0,
      fontFamily: 'inherit',
      display: 'inline-flex',
      alignItems: 'center',
      height: '100%',
      lineHeight: 'inherit',
      fontSize: 'inherit',
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

    if (this.hasFilters) {
      const after = document.createElement('span');
      const afterStyles = this.createAfterStyles();
      Object.assign(after.style, afterStyles);
      span.appendChild(after);
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
