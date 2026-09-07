import React from 'react';
import { CustomerIoContext } from './customer-io-provider';

export const useCustomerIo = () => {
  const result = React.useContext(CustomerIoContext);

  if (!result) {
    throw new Error('Context used outside of its Provider!');
  }

  return result;
};
