import '@novu/js/ui/index.css';
import { ApplicationReadyGuard } from './ApplicationReadyGuard';
import { AppRoutes } from './AppRoutes';
import Providers from './Providers';

export default function App() {
  return (
    <Providers>
      <ApplicationReadyGuard>
        <AppRoutes />
      </ApplicationReadyGuard>
    </Providers>
  );
}
