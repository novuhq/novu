import { Component, Prop, State, h } from '@stencil/core';
import { css, cx } from '@emotion/css';

const accordionHolderStyles = css`
  color: #000;
  border-bottom: none;
  box-shadow: 0px 5px 20px rgb(0 0 0 / 20%);
  background-color: #292933;
  margin-bottom: 15px;
  border-radius: 7px;
`;

const accordionItemHeaderStyles = css`
  margin: 0;
  padding: 0;
  font-weight: normal;
`;

const headerButtonStyles = css`
  cursor: pointer;
  border: 0;
  padding: 0;
  appearance: none;
  font-size: 16px;
  background-color: transparent;
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
  width: 100%;
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  padding: 16px 8px;
  padding-left: 16px;
  font-weight: 500;
  text-align: left;
  color: #000;
  font-family: Lato;
  height: 65px;
`;

const chevronStyles = css`
  width: 16px;
  height: 16px;
  transition: transform 200ms ease;
  margin-right: 0;
  margin-left: 20px;
  width: 24px;
  min-width: 24px;
  color: #828299;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const chevronStylesRotated = css`
  transform: rotate(180deg);
`;

const labelStyles = css`
  color: inherit;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const bodyHolderStyles = css`
  transition: height 200ms ease 0s;
`;

const bodyHolderHiddenStyles = css`
  box-sizing: border-box;
  height: 0px;
  overflow: hidden;
  display: none;
`;

const accordionBodyInner = css`
  opacity: 1;
  transition: opacity 200ms ease 0s;
  padding: 16px;
  padding-top: 5px;
`;

const accordionBodyInnerHidden = css`
  opacity: 0;
`;

@Component({
  tag: 'accordion-component',
})
export class AccordionComponent {
  @Prop() dataTestId?: string;
  @Prop() header: Element;
  @Prop() body: Element;

  @State() expanded = false;

  accordionItemBody: HTMLDivElement;
  accordionItemBodyInner: HTMLDivElement;

  componentDidLoad() {
    // animate height then add hidden styles
    this.accordionItemBody.classList.add(bodyHolderHiddenStyles);
    this.accordionItemBody.style.height = '0';
    this.accordionItemBodyInner.classList.add(accordionBodyInnerHidden);
  }

  private onToggleClick = (e: MouseEvent | TouchEvent) => {
    e.stopImmediatePropagation();

    this.expanded = !this.expanded;

    if (this.expanded) {
      this.accordionItemBody.classList.remove(bodyHolderHiddenStyles);
      this.accordionItemBodyInner.classList.remove(accordionBodyInnerHidden);
      this.accordionItemBody.style.height = getComputedStyle(this.accordionItemBodyInner).height;
    } else {
      setTimeout(() => {
        this.accordionItemBody.classList.add(bodyHolderHiddenStyles);
      }, 200);
      this.accordionItemBody.style.height = '0';
      this.accordionItemBodyInner.classList.add(accordionBodyInnerHidden);
    }
  };

  render() {
    return (
      <div class={accordionHolderStyles} data-test-id={this.dataTestId}>
        <h3 class={accordionItemHeaderStyles}>
          <button
            class={headerButtonStyles}
            aria-expanded={`${this.expanded}`}
            onClick={this.onToggleClick}
            onTouchEnd={this.onToggleClick}
          >
            <chevron-icon class={cx(chevronStyles, this.expanded ? chevronStylesRotated : undefined)} />
            <span class={labelStyles}>{this.header}</span>
          </button>
        </h3>
        <div ref={(ref) => (this.accordionItemBody = ref)} class={bodyHolderStyles} aria-expanded={`${this.expanded}`}>
          <div ref={(ref) => (this.accordionItemBodyInner = ref)} class={accordionBodyInner}>
            {this.body}
          </div>
        </div>
      </div>
    );
  }
}
