import { AppRoutes } from './AppRoutes';
import Providers from './Providers';
import { Gate } from './Gate';

export default function App() {
  return (
    <Providers>
      <Gate>
        <AppRoutes />
      </Gate>
    </Providers>
  );
}
