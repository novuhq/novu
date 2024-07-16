import { AppRoutes } from './AppRoutes';
import Providers from './Providers';
import { ApplicationReadyGuard } from './ApplicationReadyGuard';
import { BrowserRouter } from 'react-router-dom';
import { CONTEXT_PATH } from './config/index';

export default function App() {
  return (
    <BrowserRouter basename={CONTEXT_PATH}>
      <Providers>
        <ApplicationReadyGuard>
          <AppRoutes />
        </ApplicationReadyGuard>
      </Providers>
    </BrowserRouter>
  );
}
