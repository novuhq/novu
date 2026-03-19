/** biome-ignore-all lint/correctness/useUniqueElementIds: working correctly */
import { ChangeEventHandler, KeyboardEventHandler, useRef } from 'react';
import { cn } from '@/utils/ui';

const dayContainerClassName =
  'flex h-full items-center justify-center border-r border-r-neutral-200 last:border-r-0 last:rounded-r-lg first:rounded-l-lg first:border-l-0 first:[&_label]:rounded-l-lg last:[&_label]:rounded-r-lg';
const inputClassName = 'peer hidden';
const labelClassName =
  'text-foreground-600 peer-checked:bg-neutral-alpha-100 flex h-full w-full cursor-pointer select-none items-center justify-center text-xs font-normal';

const Day = ({
  id,
  children,
  checked,
  onChange,
  dataId,
  isDisabled,
}: {
  id?: string;
  dataId?: number;
  children: React.ReactNode;
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  isDisabled?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const onKeyDown: KeyboardEventHandler<HTMLLabelElement> = (e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className={dayContainerClassName}>
      <input
        ref={inputRef}
        className={inputClassName}
        id={id}
        type="checkbox"
        onChange={onChange}
        checked={checked}
        data-id={dataId}
        disabled={isDisabled}
      />
      <label
        className={cn(labelClassName, { 'cursor-not-allowed': isDisabled })}
        role="checkbox"
        tabIndex={0}
        htmlFor={id}
        onKeyDown={onKeyDown}
      >
        {children}
      </label>
    </div>
  );
};

export const DaysOfWeek = ({
  daysOfWeek,
  onDaysChange,
  isDisabled,
}: {
  daysOfWeek: number[];
  onDaysChange: (days: number[]) => void;
  isDisabled?: boolean;
}) => {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dataId = parseInt(e.target.getAttribute('data-id') ?? '0');

    if (e.target.checked) {
      onDaysChange([...daysOfWeek, dataId]);
    } else {
      onDaysChange(daysOfWeek.filter((day) => day !== dataId));
    }
  };

  return (
    <div className="grid h-7 w-full grid-cols-7 items-center rounded-lg border border-neutral-200">
      <Day id="monday" onChange={onChange} checked={daysOfWeek.includes(1)} dataId={1} isDisabled={isDisabled}>
        M
      </Day>
      <Day id="tuesday" onChange={onChange} checked={daysOfWeek.includes(2)} dataId={2} isDisabled={isDisabled}>
        T
      </Day>
      <Day id="wednesday" onChange={onChange} checked={daysOfWeek.includes(3)} dataId={3} isDisabled={isDisabled}>
        W
      </Day>
      <Day id="thursday" onChange={onChange} checked={daysOfWeek.includes(4)} dataId={4} isDisabled={isDisabled}>
        Th
      </Day>
      <Day id="friday" onChange={onChange} checked={daysOfWeek.includes(5)} dataId={5} isDisabled={isDisabled}>
        F
      </Day>
      <Day id="saturday" onChange={onChange} checked={daysOfWeek.includes(6)} dataId={6} isDisabled={isDisabled}>
        S
      </Day>
      <Day id="sunday" onChange={onChange} checked={daysOfWeek.includes(0)} dataId={0} isDisabled={isDisabled}>
        Su
      </Day>
    </div>
  );
};
