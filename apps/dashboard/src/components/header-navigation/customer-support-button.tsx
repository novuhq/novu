import { useBootIntercom } from '@/hooks/use-boot-intercom';
import { RiCustomerService2Line } from 'react-icons/ri';

export const CustomerSupportButton = () => {
  useBootIntercom();

  return (
    <button id="intercom-launcher">
      <RiCustomerService2Line className="size-5 cursor-pointer" />
    </button>
  );
};
