import { AppRoutes } from './AppRoutes';
import Providers from './Providers';

export default function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}
