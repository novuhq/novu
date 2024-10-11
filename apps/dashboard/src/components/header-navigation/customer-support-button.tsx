import { RiCustomerService2Line } from 'react-icons/ri';
import { useBootIntercom } from '@/hooks';

export const CustomerSupportButton = () => {
  useBootIntercom();

  return (
    <button id="intercom-launcher">
      <RiCustomerService2Line className="size-5 cursor-pointer" />
    </button>
  );
};
