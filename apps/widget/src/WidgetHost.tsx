import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { NotificationCenter } from '@novu/bell';
import { IMessage } from '@novu/shared';

export function WidgetHost() {
  function sendUrlChange(url: string): void {
    if (!window.parentIFrame) return;
    window.parentIFrame.sendMessage({
      type: 'url_change',
      url,
    });
  }

  function sendNotificationClick(notification: IMessage): void {
    if (!window.parentIFrame) return;
    window.parentIFrame.sendMessage({
      type: 'notification_click',
      notification,
    });
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/:applicationId"
          element={<NotificationCenter sendNotificationClick={sendNotificationClick} sendUrlChange={sendUrlChange} />}
        />
      </Routes>
    </Router>
  );
}
