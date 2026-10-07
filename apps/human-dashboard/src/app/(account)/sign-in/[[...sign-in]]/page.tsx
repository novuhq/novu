import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

import { SiteFrame } from '@/components/site/site-frame';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function SignInPage() {
  return (
    <SiteFrame className="items-center px-4 py-14 md:px-8 md:py-20">
      <SignIn routing="path" path="/sign-in" />
    </SiteFrame>
  );
}
