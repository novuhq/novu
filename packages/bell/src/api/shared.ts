import { useContext } from 'react';
import { NovuContext } from '../store/novu-provider.context';

const { backendUrl } = useContext(NovuContext);

export const API_URL = backendUrl || 'http://localhost:3000';

export const WS_URL = backendUrl || 'http://localhost:3002';
