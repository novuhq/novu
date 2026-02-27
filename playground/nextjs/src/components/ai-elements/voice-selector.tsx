"use client";

import type { ComponentProps, ReactNode } from "react";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  CircleSmallIcon,
  MarsIcon,
  MarsStrokeIcon,
  NonBinaryIcon,
  PauseIcon,
  PlayIcon,
  TransgenderIcon,
  VenusAndMarsIcon,
  VenusIcon,
} from "lucide-react";
import { createContext, useCallback, useContext, useMemo } from "react";

interface VoiceSelectorContextValue {
  value: string | undefined;
  setValue: (value: string | undefined) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const VoiceSelectorContext = createContext<VoiceSelectorContextValue | null>(
  null
);

export const useVoiceSelector = () => {
  const context = useContext(VoiceSelectorContext);
  if (!context) {
    throw new Error(
      "VoiceSelector components must be used within VoiceSelector"
    );
  }
  return context;
};

export type VoiceSelectorProps = ComponentProps<typeof Dialog> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string | undefined) => void;
};

export const VoiceSelector = ({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: VoiceSelectorProps) => {
  const [value, setValue] = useControllableState({
    defaultProp: defaultValue,
    onChange: onValueChange,
    prop: valueProp,
  });

  const [open, setOpen] = useControllableState({
    defaultProp: defaultOpen,
    onChange: onOpenChange,
    prop: openProp,
  });

  const voiceSelectorContext = useMemo(
    () => ({ open, setOpen, setValue, value }),
    [value, setValue, open, setOpen]
  );

  return (
    <VoiceSelectorContext.Provider value={voiceSelectorContext}>
      <Dialog onOpenChange={setOpen} open={open} {...props}>
        {children}
      </Dialog>
    </VoiceSelectorContext.Provider>
  );
};

export type VoiceSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;

export const VoiceSelectorTrigger = (props: VoiceSelectorTriggerProps) => (
  <DialogTrigger {...props} />
);

export type VoiceSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode;
};

export const VoiceSelectorContent = ({
  className,
  children,
  title = "Voice Selector",
  ...props
}: VoiceSelectorContentProps) => (
  <DialogContent
    aria-describedby={undefined}
    className={cn("p-0", className)}
    {...props}
  >
    <DialogTitle className="sr-only">{title}</DialogTitle>
    <Command className="**:data-[slot=command-input-wrapper]:h-auto">
      {children}
    </Command>
  </DialogContent>
);

export type VoiceSelectorDialogProps = ComponentProps<typeof CommandDialog>;

export const VoiceSelectorDialog = (props: VoiceSelectorDialogProps) => (
  <CommandDialog {...props} />
);

export type VoiceSelectorInputProps = ComponentProps<typeof CommandInput>;

export const VoiceSelectorInput = ({
  className,
  ...props
}: VoiceSelectorInputProps) => (
  <CommandInput className={cn("h-auto py-3.5", className)} {...props} />
);

export type VoiceSelectorListProps = ComponentProps<typeof CommandList>;

export const VoiceSelectorList = (props: VoiceSelectorListProps) => (
  <CommandList {...props} />
);

export type VoiceSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

export const VoiceSelectorEmpty = (props: VoiceSelectorEmptyProps) => (
  <CommandEmpty {...props} />
);

export type VoiceSelectorGroupProps = ComponentProps<typeof CommandGroup>;

export const VoiceSelectorGroup = (props: VoiceSelectorGroupProps) => (
  <CommandGroup {...props} />
);

export type VoiceSelectorItemProps = ComponentProps<typeof CommandItem>;

export const VoiceSelectorItem = ({
  className,
  ...props
}: VoiceSelectorItemProps) => (
  <CommandItem className={cn("px-4 py-2", className)} {...props} />
);

export type VoiceSelectorShortcutProps = ComponentProps<typeof CommandShortcut>;

export const VoiceSelectorShortcut = (props: VoiceSelectorShortcutProps) => (
  <CommandShortcut {...props} />
);

export type VoiceSelectorSeparatorProps = ComponentProps<
  typeof CommandSeparator
>;

export const VoiceSelectorSeparator = (props: VoiceSelectorSeparatorProps) => (
  <CommandSeparator {...props} />
);

export type VoiceSelectorGenderProps = ComponentProps<"span"> & {
  value?:
    | "male"
    | "female"
    | "transgender"
    | "androgyne"
    | "non-binary"
    | "intersex";
};

export const VoiceSelectorGender = ({
  className,
  value,
  children,
  ...props
}: VoiceSelectorGenderProps) => {
  let icon: ReactNode | null = null;

  switch (value) {
    case "male": {
      icon = <MarsIcon className="size-4" />;
      break;
    }
    case "female": {
      icon = <VenusIcon className="size-4" />;
      break;
    }
    case "transgender": {
      icon = <TransgenderIcon className="size-4" />;
      break;
    }
    case "androgyne": {
      icon = <MarsStrokeIcon className="size-4" />;
      break;
    }
    case "non-binary": {
      icon = <NonBinaryIcon className="size-4" />;
      break;
    }
    case "intersex": {
      icon = <VenusAndMarsIcon className="size-4" />;
      break;
    }
    default: {
      icon = <CircleSmallIcon className="size-4" />;
    }
  }

  return (
    <span className={cn("text-muted-foreground text-xs", className)} {...props}>
      {children ?? icon}
    </span>
  );
};

export type VoiceSelectorAccentProps = ComponentProps<"span"> & {
  value?:
    | "american"
    | "british"
    | "australian"
    | "canadian"
    | "irish"
    | "scottish"
    | "indian"
    | "south-african"
    | "new-zealand"
    | "spanish"
    | "french"
    | "german"
    | "italian"
    | "portuguese"
    | "brazilian"
    | "mexican"
    | "argentinian"
    | "japanese"
    | "chinese"
    | "korean"
    | "russian"
    | "arabic"
    | "dutch"
    | "swedish"
    | "norwegian"
    | "danish"
    | "finnish"
    | "polish"
    | "turkish"
    | "greek"
    | string;
};

export const VoiceSelectorAccent = ({
  className,
  value,
  children,
  ...props
}: VoiceSelectorAccentProps) => {
  let emoji: string | null = null;

  switch (value) {
    case "american": {
      emoji = "🇺🇸";
      break;
    }
    case "british": {
      emoji = "🇬🇧";
      break;
    }
    case "australian": {
      emoji = "🇦🇺";
      break;
    }
    case "canadian": {
      emoji = "🇨🇦";
      break;
    }
    case "irish": {
      emoji = "🇮🇪";
      break;
    }
    case "scottish": {
      emoji = "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
      break;
    }
    case "indian": {
      emoji = "🇮🇳";
      break;
    }
    case "south-african": {
      emoji = "🇿🇦";
      break;
    }
    case "new-zealand": {
      emoji = "🇳🇿";
      break;
    }
    case "spanish": {
      emoji = "🇪🇸";
      break;
    }
    case "french": {
      emoji = "🇫🇷";
      break;
    }
    case "german": {
      emoji = "🇩🇪";
      break;
    }
    case "italian": {
      emoji = "🇮🇹";
      break;
    }
    case "portuguese": {
      emoji = "🇵🇹";
      break;
    }
    case "brazilian": {
      emoji = "🇧🇷";
      break;
    }
    case "mexican": {
      emoji = "🇲🇽";
      break;
    }
    case "argentinian": {
      emoji = "🇦🇷";
      break;
    }
    case "japanese": {
      emoji = "🇯🇵";
      break;
    }
    case "chinese": {
      emoji = "🇨🇳";
      break;
    }
    case "korean": {
      emoji = "🇰🇷";
      break;
    }
    case "russian": {
      emoji = "🇷🇺";
      break;
    }
    case "arabic": {
      emoji = "🇸🇦";
      break;
    }
    case "dutch": {
      emoji = "🇳🇱";
      break;
    }
    case "swedish": {
      emoji = "🇸🇪";
      break;
    }
    case "norwegian": {
      emoji = "🇳🇴";
      break;
    }
    case "danish": {
      emoji = "🇩🇰";
      break;
    }
    case "finnish": {
      emoji = "🇫🇮";
      break;
    }
    case "polish": {
      emoji = "🇵🇱";
      break;
    }
    case "turkish": {
      emoji = "🇹🇷";
      break;
    }
    case "greek": {
      emoji = "🇬🇷";
      break;
    }
    default: {
      emoji = null;
    }
  }

  return (
    <span className={cn("text-muted-foreground text-xs", className)} {...props}>
      {children ?? emoji}
    </span>
  );
};

export type VoiceSelectorAgeProps = ComponentProps<"span">;

export const VoiceSelectorAge = ({
  className,
  ...props
}: VoiceSelectorAgeProps) => (
  <span
    className={cn("text-muted-foreground text-xs tabular-nums", className)}
    {...props}
  />
);

export type VoiceSelectorNameProps = ComponentProps<"span">;

export const VoiceSelectorName = ({
  className,
  ...props
}: VoiceSelectorNameProps) => (
  <span
    className={cn("flex-1 truncate text-left font-medium", className)}
    {...props}
  />
);

export type VoiceSelectorDescriptionProps = ComponentProps<"span">;

export const VoiceSelectorDescription = ({
  className,
  ...props
}: VoiceSelectorDescriptionProps) => (
  <span className={cn("text-muted-foreground text-xs", className)} {...props} />
);

export type VoiceSelectorAttributesProps = ComponentProps<"div">;

export const VoiceSelectorAttributes = ({
  className,
  children,
  ...props
}: VoiceSelectorAttributesProps) => (
  <div className={cn("flex items-center text-xs", className)} {...props}>
    {children}
  </div>
);

export type VoiceSelectorBulletProps = ComponentProps<"span">;

export const VoiceSelectorBullet = ({
  className,
  ...props
}: VoiceSelectorBulletProps) => (
  <span
    aria-hidden="true"
    className={cn("select-none text-border", className)}
    {...props}
  >
    &bull;
  </span>
);

export type VoiceSelectorPreviewProps = Omit<
  ComponentProps<"button">,
  "children"
> & {
  playing?: boolean;
  loading?: boolean;
  onPlay?: () => void;
};

export const VoiceSelectorPreview = ({
  className,
  playing,
  loading,
  onPlay,
  onClick,
  ...props
}: VoiceSelectorPreviewProps) => {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onClick?.(event);
      onPlay?.();
    },
    [onClick, onPlay]
  );

  let icon = <PlayIcon className="size-3" />;

  if (loading) {
    icon = <Spinner className="size-3" />;
  } else if (playing) {
    icon = <PauseIcon className="size-3" />;
  }

  return (
    <Button
      aria-label={playing ? "Pause preview" : "Play preview"}
      className={cn("size-6", className)}
      disabled={loading}
      onClick={handleClick}
      size="icon-sm"
      type="button"
      variant="outline"
      {...props}
    >
      {icon}
    </Button>
  );
};
