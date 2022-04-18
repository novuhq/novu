import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { WidgetShell } from './ApplicationShell';
import { NotificationCenterWidgetContainer } from './notification-center';
import { sendNotificationClick, sendUrlChange, unseenChanged } from '../sdk/sdk.service';

export function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/:applicationId"
          element={
            <WidgetShell>
              <NotificationCenterWidgetContainer
                onNotificationClick={sendNotificationClick}
                onUrlChange={sendUrlChange}
                onUnseenCountChanged={unseenChanged}
              />
            </WidgetShell>
          }
        />
      </Routes>
    </Router>
  );
}
