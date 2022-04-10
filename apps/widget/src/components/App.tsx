import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { WidgetShell } from './ApplicationShell';

export function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/:applicationId"
          element={
            <WidgetShell>
              <div />
              {/*<NotificationCenter*/}
              {/*  sendNotificationClick={sendNotificationClick}*/}
              {/*  sendUrlChange={sendUrlChange}*/}
              {/*  onUnseenCountChanged={unseenChanged}*/}
              {/*/>*/}
            </WidgetShell>
          }
        />
      </Routes>
    </Router>
  );
}
