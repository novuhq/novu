import { ChangeEventHandler, KeyboardEventHandler, useRef } from 'react';

const dayContainerClassName =
  'flex h-full items-center justify-center border-r border-r-neutral-200 last:border-r-0 last:rounded-r-lg first:rounded-l-lg first:border-l-0 [&_label]:first:rounded-l-lg [&_label]:last:rounded-r-lg';
const inputClassName = 'peer hidden';
const labelClassName =
  'text-foreground-600 peer-checked:bg-neutral-alpha-100 flex h-full w-full cursor-pointer select-none items-center justify-center text-xs font-normal';

const Day = ({
  id,
  children,
  checked,
  onChange,
  dataId,
}: {
  id?: string;
  dataId?: number;
  children: React.ReactNode;
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
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
      />
      <label className={labelClassName} role="checkbox" tabIndex={0} htmlFor={id} onKeyDown={onKeyDown}>
        {children}
      </label>
    </div>
  );
};

export const DaysOfWeek = ({
  daysOfWeek,
  onDaysChange,
}: {
  daysOfWeek: number[];
  onDaysChange: (days: number[]) => void;
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
      <Day id="monday" onChange={onChange} checked={daysOfWeek.includes(1)} dataId={1}>
        M
      </Day>
      <Day id="tuesday" onChange={onChange} checked={daysOfWeek.includes(2)} dataId={2}>
        T
      </Day>
      <Day id="wednesday" onChange={onChange} checked={daysOfWeek.includes(3)} dataId={3}>
        W
      </Day>
      <Day id="thursday" onChange={onChange} checked={daysOfWeek.includes(4)} dataId={4}>
        Th
      </Day>
      <Day id="friday" onChange={onChange} checked={daysOfWeek.includes(5)} dataId={5}>
        F
      </Day>
      <Day id="saturday" onChange={onChange} checked={daysOfWeek.includes(6)} dataId={6}>
        S
      </Day>
      <Day id="sunday" onChange={onChange} checked={daysOfWeek.includes(0)} dataId={0}>
        Su
      </Day>
    </div>
  );
};
