import { AppRoutes } from './AppRoutes';
import Providers from './Providers';
import { ApplicationReadyGuard } from './ApplicationReadyGuard';

export default function App() {
  return (
    <Providers>
      <ApplicationReadyGuard>
        <AppRoutes />
      </ApplicationReadyGuard>
    </Providers>
  );
}
