import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { WidgetShell } from './ApplicationShell';
import { NotificationCenterWidgetContainer } from './notification-center/NotificationCenterWidgetContainer';
import { useUser } from '../api/hooks/use-user';

export function App() {
  const { user } = useUser();

  return (
    <Router>
      <Routes>
        <Route
          path="/:applicationId"
          element={
            <WidgetShell>
              <NotificationCenterWidgetContainer user={user} />
            </WidgetShell>
          }
        />
      </Routes>
    </Router>
  );
}
