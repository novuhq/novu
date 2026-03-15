import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState } from 'react';
import { RiMenuLine } from 'react-icons/ri';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '@/components/primitives/sheet';
import { SideNavigation } from './side-navigation';

export function MobileSideNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex size-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 md:hidden"
        aria-label="Open navigation"
      >
        <RiMenuLine className="size-5" />
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[275px] p-0 sm:max-w-[275px]">
          <VisuallyHidden>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <SideNavigation />
        </SheetContent>
      </Sheet>
    </>
  );
}
