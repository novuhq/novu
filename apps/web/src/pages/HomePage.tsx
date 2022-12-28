import { Navigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes.enum';

function HomePage() {
  return <Navigate to={ROUTES.TEMPLATES} replace />;
}

export default HomePage;
