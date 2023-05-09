/* eslint-disable @typescript-eslint/naming-convention */
import SandPack from '../../SandPack/SandPack';
import React from 'react';
import { customStyleCode } from './shared';

export const files = {
  'styles.ts': {
    code: customStyleCode,
    active: true,
  },
  'Novu.tsx': `import {
    NovuProvider,
    PopoverNotificationCenter,
    NotificationBell,
  } from "@novu/notification-center";
import { styles } from "./styles";

const subscriberId = "YOUR_SUBSCRIBER_ID";
const applicationIdentifier = "YOUR_APPLICATION_IDENTIFIER";

function NovuNotificationCenter() {
  return (
    <NovuProvider
      subscriberId={subscriberId}
      applicationIdentifier={applicationIdentifier}
      styles={styles}
    >
      <PopoverNotificationCenter colorScheme="light" position="bottom">
        {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
}

export default NovuNotificationCenter`,
  'App.tsx': `import NovuNotificationCenter from "./Novu";

function App() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <p style={{ textAlign: "center", fontSize: "12px", maxWidth: "80%" }}>
        Change <b>subscriberId</b> and <b>applicationIdentifier</b> variables in{" "}
        <b>Novu.tsx</b> file with valid values to remove loader.
      </p>
      <NovuNotificationCenter />
    </div>
  );
}
export default App;`,
};

const ReactCustomStyling = () => {
  return (
    <SandPack theme={'dark'} template="react-ts" files={files} options={{ wrapContent: true }} />
  );
};

export default ReactCustomStyling;
