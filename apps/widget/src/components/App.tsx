import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { actionClick, sendNotificationClick, sendUrlChange, unseenChanged } from '../embed/embed.service';
import { CONTEXT_PATH } from '../config';
import { WidgetShell } from './ApplicationShell';
import { NotificationCenterWidgetContainer } from './notification-center';

export function App() {
  return (
    <Router basename={CONTEXT_PATH}>
      <Routes>
        <Route
          path="/:applicationId"
          element={
            <WidgetShell>
              <NotificationCenterWidgetContainer
                onNotificationClick={sendNotificationClick}
                onUrlChange={sendUrlChange}
                onUnseenCountChanged={unseenChanged}
                onActionClick={actionClick}
              />
            </WidgetShell>
          }
        />
      </Routes>
    </Router>
  );
}
