import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { NotificationCenter } from '@novu/bell';
import { sendNotificationClick, sendUrlChange, unseenChanged } from '../sdk/sdk.service';
import { WidgetShell } from './ApplicationShell';

export function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/:applicationId"
          element={
            <WidgetShell>
              <NotificationCenter
                sendNotificationClick={sendNotificationClick}
                sendUrlChange={sendUrlChange}
                onUnseenCountChanged={unseenChanged}
              />
            </WidgetShell>
          }
        />
      </Routes>
    </Router>
  );
}
