import { cn } from '@/utils/ui';
import * as React from 'react';
import { RiArrowDownSLine, RiCheckLine, RiPhoneLine, RiSearchLine } from 'react-icons/ri';
import * as RPNInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { Button } from './button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';
import { InputPure, InputRoot, InputWrapper } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type PhoneInputProps = Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'ref'> &
  Omit<RPNInput.Props<typeof RPNInput.default>, 'onChange'> & {
    onChange?: (value: RPNInput.Value) => void;
  };

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> = React.forwardRef<
  React.ElementRef<typeof RPNInput.default>,
  PhoneInputProps
>(({ className, onChange, ...props }, ref) => {
  return (
    <RPNInput.default
      ref={ref}
      className={cn('flex', className)}
      flagComponent={FlagComponent}
      countrySelectComponent={CountrySelect}
      inputComponent={InputComponent}
      smartCaret={false}
      /**
       * Handles the onChange event.
       *
       * react-phone-number-input might trigger the onChange event as undefined
       * when a valid phone number is not entered. To prevent this,
       * the value is coerced to an empty string.
       *
       * @param {E164Number | undefined} value - The entered value
       */
      onChange={(value) => onChange?.(value || ('' as RPNInput.Value))}
      international
      {...props}
    />
  );
});
PhoneInput.displayName = 'PhoneInput';

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

const CountrySelect = ({ disabled, value: selectedCountry, options: countryList, onChange }: CountrySelectProps) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const scrollId = React.useRef<ReturnType<typeof setTimeout>>();

  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          mode="outline"
          className="flex h-8 items-center gap-1 rounded-e-none rounded-s-lg border-r-0 px-3 focus:z-10"
          disabled={disabled}
        >
          <FlagComponent country={selectedCountry} countryName={selectedCountry} />
          <RiArrowDownSLine className={cn('-mr-2 size-4 opacity-50', disabled ? 'hidden' : 'opacity-100')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent portal={false} className="w-[300px] rounded-lg p-0">
        <Command>
          <CommandInput
            placeholder="Search country..."
            inputRootClassName="rounded-b-none before:ring-0 before:border-b has-[input:focus]:shadow-none focus-within:shadow-none"
            inlineLeadingNode={<RiSearchLine className="size-4 text-neutral-400" />}
            /**
             * Scroll to top bug workaround: https://github.com/pacocoursey/cmdk/issues/233#issuecomment-2015998940
             */
            onValueChange={() => {
              // clear pending scroll
              clearTimeout(scrollId.current);

              // the setTimeout is used to create a new task
              // this is to make sure that we don't scroll until the user is done typing
              // you can tweak the timeout duration ofc
              scrollId.current = setTimeout(() => {
                // inside your list select the first group and scroll to the top
                const div = listRef.current;
                div?.scrollTo({ top: 0, behavior: 'smooth' });
              }, 0);
            }}
            autoComplete="off"
          />
          <CommandList ref={listRef}>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup className="rounded-md py-2">
              {countryList.map(({ value, label }) =>
                value ? (
                  <CountrySelectOption
                    key={value}
                    country={value}
                    countryName={label}
                    selectedCountry={selectedCountry}
                    onChange={onChange}
                  />
                ) : null
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const InputComponent = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof InputPure>>(
  ({ className, ...props }, ref) => (
    <InputRoot size="xs" className="rounded-s-none">
      <InputWrapper>
        <InputPure className={cn('rounded-e-lg rounded-s-none', className)} ref={ref} {...props} autoComplete="off" />
      </InputWrapper>
    </InputRoot>
  )
);
InputComponent.displayName = 'InputComponent';

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
}

const CountrySelectOption = ({ country, countryName, selectedCountry, onChange }: CountrySelectOptionProps) => {
  return (
    <CommandItem className="gap-3" onSelect={() => onChange(country)}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-foreground/50 text-sm">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
      <RiCheckLine className={`ml-auto size-4 ${country === selectedCountry ? 'opacity-100' : 'opacity-0'}`} />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span
      className="bg-foreground/20 flex h-4 w-6 overflow-hidden rounded-sm drop-shadow-md [&_svg]:size-full"
      key={country}
    >
      {Flag ? <Flag title={countryName} /> : <RiPhoneLine className="size-4 text-neutral-400" />}
    </span>
  );
};

export { PhoneInput };
