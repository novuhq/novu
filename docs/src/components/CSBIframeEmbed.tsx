/* eslint-disable @typescript-eslint/naming-convention */
import React from 'react';

/*
 * Check this doc for all options
 * https://codesandbox.io/docs/learn/sandboxes/embedding#embed-options
 */

type zeroOrOne = 0 | 1;

interface ICSBIframeEmbedProps {
  autoresize?: zeroOrOne;
  codemirror?: zeroOrOne;
  editorsize?: number;
  eslint?: zeroOrOne;
  expanddevtools?: zeroOrOne;
  hidedevtools?: zeroOrOne;
  fontsize?: number;
  forcerefresh?: zeroOrOne;
  hidenavigation?: zeroOrOne;
  highlights?: string;
  initialpath?: string;
  module?: string;
  moduleview?: zeroOrOne;
  previewwindow?: 'console' | 'tests' | 'browser';
  runonclick?: zeroOrOne;
  view?: 'preview' | 'split' | 'editor';
  theme?: 'dark' | 'light';

  // extra props
  width: string;
  height: string;
  sandBoxId: string;
  title: string;
}

export default function CSBIframeEmbed({
  autoresize = 1,
  codemirror = 1,
  editorsize = 50,
  eslint = 0,
  expanddevtools = 0,
  hidedevtools = 1,
  fontsize = 10,
  forcerefresh = 0,
  hidenavigation = 1,
  highlights = '',
  initialpath = '',
  module = '',
  moduleview = 0,
  previewwindow = 'browser',
  runonclick = 1,
  view = 'split',
  theme = 'dark',
  width = '100%',
  height = '500px',
  sandBoxId,
  title = 'Novu CodeSandBox',
}: ICSBIframeEmbedProps) {
  return (
    <iframe
      width={width}
      height={height}
      src={`https://codesandbox.io/embed/${sandBoxId}?autoresize=${autoresize}&codemirror=${codemirror}&editorsize=${editorsize}&eslint=${eslint}&expanddevtools=${expanddevtools}&hidedevtools=${hidedevtools}&fontsize=${fontsize}&forcerefresh=${forcerefresh}&hidenavigation=${hidenavigation}&highlights=${highlights}&initialpath=${initialpath}&module=${module}&moduleview=${moduleview}&previewwindow=${previewwindow}&runonclick=${runonclick}&view=${view}&theme=${theme}}`}
      title={title}
      allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
      sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
    ></iframe>
  );
}
