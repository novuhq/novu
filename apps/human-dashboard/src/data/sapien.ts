import { logoAssets } from '@/data/sapien-assets';
import { PACKAGE_URL, SOURCE_URL } from '@/lib/seo';

export const SETUP_COMMAND = 'npx @agentinbox/cli setup';
export type NavigationItem = {
  label: string;
  href: string;
  variant?: 'outline';
};
export const NAVIGATION: readonly NavigationItem[] = [
  { label: 'for robots', href: '/', variant: 'outline' },
  { label: 'npm', href: PACKAGE_URL },
  {
    label: 'github',
    href: SOURCE_URL,
  },
];

/** The header's links and its small-screen menu: the footer's, then the way into the dashboard. */
export const HEADER_NAVIGATION: readonly NavigationItem[] = [...NAVIGATION, { label: 'sign in', href: '/sign-in' }];

export const CUSTOMER_LOGOS = [
  { name: 'teamcore', asset: logoAssets.imgLogo },
  { name: 'El-Proffen', asset: logoAssets.imgLogo1 },
  { name: 'TrustFlight', asset: logoAssets.imgGroup },
  { name: 'MedVol', asset: logoAssets.imgGroup2085663700 },
  { name: 'Check Point', asset: logoAssets.imgLogo2 },
  { name: 'MongoDB', asset: logoAssets.imgLogo3 },
  { name: 'Cloud Software Group', asset: logoAssets.imgLogo4 },
  { name: 'Gangverk', asset: logoAssets.imgLogo5 },
  { name: 'Ebury', asset: logoAssets.imgLogo6 },
  { name: 'Mothership', asset: logoAssets.imgLogo7 },
  { name: 'Mottu', asset: logoAssets.imgLogo8 },
  { name: 'Correla', asset: logoAssets.imgGroup1 },
  { name: 'checksammy', asset: logoAssets.imgLogo9 },
  { name: 'Sinch', asset: logoAssets.imgGroup2 },
  { name: 'LottieFiles', asset: logoAssets.imgGroup2085663701 },
  { name: 'Guesty', asset: logoAssets.imgLogo10 },
  { name: 'BitMEX', asset: logoAssets.imgLogo11 },
  { name: 'Quorum Cyber', asset: logoAssets.imgQuorumCyberLogoLight },
  { name: 'Unified', asset: logoAssets.imgUnified },
  { name: 'Veridas', asset: logoAssets.imgLogo12 },
  { name: 'Normative', asset: logoAssets.imgLogo13 },
  { name: 'PriceLabs', asset: logoAssets.imgGroup3 },
  { name: 'Veritext Partners', asset: logoAssets.imgLogo14 },
  { name: 'Sherweb', asset: logoAssets.imgLogo15 },
  { name: 'BPP', asset: logoAssets.imgLogo16 },
  { name: 'MedPrev', asset: logoAssets.imgLogo17 },
  { name: 'NEP', asset: logoAssets.imgLogo18 },
  { name: 'Phocas', asset: logoAssets.imgGroup2085663698 },
] as const;
