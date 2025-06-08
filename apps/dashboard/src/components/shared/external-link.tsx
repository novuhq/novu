import { LinkButton } from '@/components/primitives/button-link';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { IconType } from 'react-icons';
import { RiArrowRightUpLine, RiBookMarkedLine, RiQuestionLine } from 'react-icons/ri';

interface ExternalLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> {
  children: React.ReactNode;
  iconClassName?: string;
  variant?: 'default' | 'documentation' | 'tip' | 'text';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  'data-test-id'?: string;
  underline?: boolean;
  size?: 'sm' | 'md';
}

export function ExternalLink({
  children,
  className,
  variant = 'default',
  href,
  onClick,
  target,
  rel,
  referrerPolicy,
  id,
  underline = true,
  size = 'sm',
  'aria-label': ariaLabel,
}: ExternalLinkProps) {
  const telemetry = useTelemetry();

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    telemetry(TelemetryEvent.EXTERNAL_LINK_CLICKED, {
      href,
      variant,
    });
    onClick?.(e);
  };

  const getTrailingIcon = (): IconType | undefined => {
    if (variant === 'text') return undefined;
    if (variant === 'documentation') return RiBookMarkedLine;
    if (variant === 'tip') return RiQuestionLine;

    return RiArrowRightUpLine;
  };

  return (
    <a href={href} target={target || '_blank'} rel={rel || 'noopener noreferrer'} referrerPolicy={referrerPolicy}>
      <LinkButton
        variant="gray"
        size={size}
        underline={underline}
        className={cn('text-foreground-400', className)}
        onClick={handleClick}
        trailingIcon={getTrailingIcon()}
        id={id}
        aria-label={ariaLabel}
      >
        {children}
      </LinkButton>
    </a>
  );
}
