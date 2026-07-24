type TrustedCompaniesProps = {
  label?: string;
};

export function TrustedCompanies({ label = 'TRUSTED BY' }: TrustedCompaniesProps) {
  return (
    <div className="inline-flex h-[87px] w-[365px] flex-col items-center justify-center gap-[19px]">
      <div className="inline-flex h-[18px] items-center justify-center self-stretch">
        <div className="h-px shrink grow basis-0 bg-black/5" />
        <div className="inline-flex flex-col items-start justify-start px-4">
          <div className="flex flex-col items-center justify-start">
            <div className="text-center text-[10px] font-normal leading-[18px] tracking-wider text-[#99a0ad]">
              {label}
            </div>
          </div>
        </div>
        <div className="h-px shrink grow basis-0 bg-black/5" />
      </div>
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="inline-flex items-center justify-center gap-5">
          <CompanyLogo name="capgemini" />
          <CompanyLogo name="hemnet" />
          <CompanyLogo name="mongodb" />
        </div>
        <div className="inline-flex items-center justify-center gap-5">
          <CompanyLogo name="siemens" />
          <CompanyLogo name="unity" />
        </div>
      </div>
    </div>
  );
}

interface CompanyLogoProps {
  name: string;
}

function CompanyLogo({ name }: CompanyLogoProps) {
  return (
    <div className="inline-flex flex-col items-start justify-start px-5">
      <div className="flex flex-col items-start justify-start">
        <div className="relative h-[20px]">
          <img src={`/images/auth/${name}-customer.svg`} alt={name} />
        </div>
      </div>
    </div>
  );
}
