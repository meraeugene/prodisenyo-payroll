import { TbDatabaseOff } from "react-icons/tb";

export default function EngineerPreviewBanner() {
  return <div role="status" className="mb-5 flex items-start gap-3 rounded-[6px] border border-[#efd39f] bg-[#fff9ed] px-4 py-3 text-[#765018]"><TbDatabaseOff className="mt-0.5 shrink-0" size={18} /><div><p className="text-xs font-semibold">Preview data</p><p className="mt-0.5 text-[10px] leading-4">The Engineer database migration is not available, so this screen is using realistic sample construction data. Preview changes reset after refresh.</p></div></div>;
}
