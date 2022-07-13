import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { WidgetShell } from './ApplicationShell';
import { NotificationCenterWidgetContainer } from './notification-center';
import { actionClick, sendNotificationClick, sendUrlChange, unseenChanged } from '../embed/embed.service';

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
                onActionClick={actionClick}
              />
            </WidgetShell>
          }
        />
      </Routes>
    </Router>
  );
}
