import { cn } from '../../utils/ui';
import { Card } from '../primitives/card';

export function AuthCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={cn('flex min-h-[692px] w-full max-w-[1100px] overflow-hidden', className)}>{children}</Card>;
}
