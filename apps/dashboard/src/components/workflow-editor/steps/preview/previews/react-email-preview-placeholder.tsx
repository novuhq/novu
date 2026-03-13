const imgMailIcon = 'https://www.figma.com/api/mcp/asset/dffd5e8b-d01f-4dc6-93e5-db2a19d7073e';

export function ReactEmailPreviewPlaceholder() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 px-8 pt-8">
      <div className="flex flex-col items-center gap-[33px]">
        <div className="rounded-[8px] border border-dashed border-[#e1e4ea] p-1">
          <div className="flex h-[38px] w-[128px] items-center justify-center rounded-[6px] border border-[#e1e4ea] bg-white">
            <img alt="" className="size-4" height={16} loading="lazy" src={imgMailIcon} width={16} />
          </div>
        </div>

        <div className="-my-[33px] h-[33px] w-px bg-[#e1e4ea]" />

        <div className="rounded-[8px] border border-[#e1e4ea] bg-white p-1">
          <div className="flex w-[197px] flex-col overflow-hidden rounded-[6px] border border-[#e1e4ea]">
            <div className="flex items-center gap-1 border-b border-[#e1e4ea] p-2">
              <div className="size-4 shrink-0 overflow-hidden rounded-full bg-[#f4f5f6]">
                <img
                  alt=""
                  className="size-full object-cover"
                  height={16}
                  loading="lazy"
                  src="/images/building.svg"
                  width={16}
                />
              </div>
              <div className="flex flex-col gap-[3px]">
                <div className="h-[5px] w-11 rounded-full bg-gradient-to-r from-[#f1efef] to-[rgba(249,248,248,0.75)]" />
                <div className="h-[5px] w-[77px] rounded-full bg-gradient-to-r from-[#f1efef] to-[rgba(249,248,248,0.75)]" />
              </div>
            </div>

            <div className="flex flex-col items-center bg-[#fbfbfb] px-6 py-4">
              <div className="flex w-full flex-col gap-2.5 rounded-[6px] border border-[#e1e4ea] bg-white p-2">
                <div className="size-3 rounded bg-gradient-to-r from-[#f1efef] to-[rgba(249,248,248,0.75)]" />
                <div className="h-1 w-[77px] rounded-full bg-gradient-to-r from-[#f1efef] to-[rgba(249,248,248,0.75)]" />
                <div className="flex flex-wrap gap-[3px]">
                  <div className="h-1 w-16 rounded-full bg-gradient-to-r from-[#f1efef] to-[rgba(249,248,248,0.75)]" />
                  <div className="h-1 w-8 rounded-full bg-gradient-to-r from-[#f1efef] to-[rgba(249,248,248,0.75)]" />
                  <div className="h-1 min-w-[20px] flex-1 rounded-full bg-gradient-to-r from-[#f1efef] to-[rgba(249,248,248,0.75)]" />
                  <div className="h-1 w-11 rounded-full bg-gradient-to-r from-[#f1efef] to-[rgba(249,248,248,0.75)]" />
                </div>
                <div className="h-1 w-6 rounded-full bg-gradient-to-r from-[#f1efef] to-[rgba(249,248,248,0.75)]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-label-xs font-medium text-[#99a0ae]">Nothing to preview</p>
        <p className="text-label-xs text-[#99a0ae]">Preview will appear once React Email is linked to this step.</p>
      </div>
    </div>
  );
}
