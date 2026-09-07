import { useContext } from 'react';
import { HttpRequestTestContext, type HttpRequestTestContextType } from './http-request-test-context';

export function useHttpRequestTest(): HttpRequestTestContextType {
  const context = useContext(HttpRequestTestContext);

  if (!context) {
    throw new Error('useHttpRequestTest must be used within a HttpRequestTestProvider');
  }

  return context;
}
