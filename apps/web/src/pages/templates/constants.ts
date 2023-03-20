export enum TemplateAnalyticsEnum {
  CREATE_TEMPLATE_CLICK = '[Templates] Create Template Click',
  TRY_DIGEST_CLICK = '[Templates] Try Digest Click',
}

export enum TemplateEditorAnalyticsEnum {
  CONFIGURE_PROVIDER_BANNER_CLICK = '[Template Editor] Configure Provider Banner Click',
  CONFIGURE_PROVIDER_POPOVER_CLICK = '[Template Editor] Configure Provider Popover Click',
}

export enum DigestPlaygroundAnalyticsEnum {
  BACK_BUTTON_CLICK = '[Digest Playground] Back Button Click',
  SETUP_DIGEST_WORKFLOW_CLICK = '[Digest Playground] Set Up Digest Workflow Click',
  LEARN_MORE_IN_DOCS_CLICK = '[Digest Playground] Learn More In Docs Click',
  RUN_TRIGGER_CLICK = '[Digest Playground] Run Trigger Click',
  DIGEST_INTERVAL_CHANGE = '[Digest Playground] Digest Interval Change',
}

export enum DigestWorkflowTourAnalyticsEnum {
  FIRST_HINT_NEXT_CLICK = '[Digest Workflow Tour] First Hint Next Click',
  SECOND_HINT_NEXT_CLICK = '[Digest Workflow Tour] Second Hint Next Click',
  THIRD_HINT_GOT_IT_CLICK = '[Digest Workflow Tour] Third Hint Got It Click',
  HINT_SKIP_TOUR_CLICK = '[Digest Workflow Tour] Hint Skip Tour Click',
  NAVIGATE_HINT_CLICK = '[Digest Workflow Tour] Navigate Hint Click',
}

export const HINT_INDEX_TO_CLICK_ANALYTICS = {
  0: DigestWorkflowTourAnalyticsEnum.FIRST_HINT_NEXT_CLICK,
  1: DigestWorkflowTourAnalyticsEnum.SECOND_HINT_NEXT_CLICK,
  2: DigestWorkflowTourAnalyticsEnum.THIRD_HINT_GOT_IT_CLICK,
};

export const ordinalNumbers = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  6: 'sixth',
  7: 'seventh',
  8: 'eighth',
  9: 'ninth',
  10: 'tenth',
};
