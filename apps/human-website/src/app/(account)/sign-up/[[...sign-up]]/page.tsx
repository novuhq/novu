import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';

import { SiteFrame } from '@/components/site/site-frame';

export const metadata: Metadata = {
  title: 'Sign up',
};

export default function SignUpPage() {
  return (
    <SiteFrame className="items-center px-4 py-14 md:px-8 md:py-20">
      <SignUp routing="path" path="/sign-up" />
    </SiteFrame>
  );
}
