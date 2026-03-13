import React from 'react';
import { CustomerIoService } from '@/utils/customer-io';

type Props = {
  children: React.ReactNode;
};

export const CustomerIoContext = React.createContext<CustomerIoService>({} as CustomerIoService);

export const CustomerIoProvider = ({ children }: Props) => {
  const customerIo = React.useMemo(() => new CustomerIoService(), []);

  return <CustomerIoContext.Provider value={customerIo}>{children}</CustomerIoContext.Provider>;
};
