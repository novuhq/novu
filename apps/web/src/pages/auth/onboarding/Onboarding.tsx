import { useColorScheme } from '@novu/design-system';
import { css } from '@novu/novui/css';
import { IconClose, IconCloseFullscreen } from '@novu/novui/icons';
import { HStack, LinkOverlay } from '@novu/novui/jsx';
import { Link } from 'react-router-dom';
import { COMPANY_LOGO_TEXT_PATH, COMPANY_LOGO_TEXT_PATH_DARK_TEXT } from '../../../constants/assets';
import { ROUTES } from '../../../constants/routes';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { GetStartedPageV2 } from '../../../studio/components/GetStartedPageV2/index';
import CodeEditor from '../../../studio/components/workflows/step-editor/editor/CodeEditor';
import { RunExpressApp } from '../../../studio/components/workflows/step-editor/editor/RunExpressApp';
import { useState } from 'react';
import { BRIDGE_CODE } from '../../../studio/components/workflows/step-editor/editor/bridge-code.const';

export function OnboardingPage() {
  const track = useTelemetry();
  const { colorScheme } = useColorScheme();
  const [code, setCode] = useState(BRIDGE_CODE);

  return (
    <div>
      <CodeEditor code={code} setCode={setCode} />
      <iframe></iframe>
      <RunExpressApp code={code} />
    </div>
  );
}
