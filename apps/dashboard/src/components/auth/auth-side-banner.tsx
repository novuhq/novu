import { Button } from '@/components/primitives/button';
import { openInNewTab } from '@/utils/url';
import { IS_ENTERPRISE, IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '../../config';
import { CircleCheck } from '../icons/circle-check';
import { Plug } from '../icons/plug';
import { ShieldZap } from '../icons/shield-zap';
import { Sparkling } from '../icons/sparkling';
import { AuthFeatureRow } from './auth-feature-row';
import { TrustedCompanies } from './trusted-companies';

export function AuthSideBanner() {
  return (
    <div className="inline-flex h-full w-full max-w-[476px] flex-col items-center justify-center gap-[50px] p-5">
      <div className="flex flex-col items-start justify-start gap-4">
        <div className="inline-flex items-center justify-start gap-3">
          <img src="/logo-transparent.png" className="w-[200px]" alt="logo" />
        </div>
        {IS_SELF_HOSTED ? (
          <div className="flex hidden flex-col items-start justify-start gap-4 md:block">
            <div className="flex flex-col items-start justify-start gap-1.5 self-stretch">
              <div className="text-2xl font-medium leading-8 text-[#ffb900]">
                {IS_ENTERPRISE ? 'Welcome to Novu Enterprise' : 'Bem vindo ao Novu AUVP!'}
              </div>
              <div className="text-sm leading-snug text-neutral-300">
                {IS_ENTERPRISE
                  ? 'Enterprise-grade notification infrastructure with premium support and advanced features.'
                  : 'AUVP é a versão auto-hospedada do Novu, oferecendo controle total sobre sua infraestrutura de notificações.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex hidden flex-col items-start justify-start gap-4 md:block">
            <div className="flex flex-col items-start justify-start gap-1.5 self-stretch">
              <div className="text-2xl font-medium leading-8 text-neutral-950">
                Send your first notification in minutes.
              </div>
              <div className="inline-flex justify-start gap-1">
                <CircleCheck className="h-3 w-3" color="#99a0ad" />
                <div className="text-xs font-medium leading-none text-neutral-400">
                  No credit card required, 10k workflow runs for free every month.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
