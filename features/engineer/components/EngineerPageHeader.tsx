import Link from "next/link";
import { TbChevronLeft } from "react-icons/tb";

export default function EngineerPageHeader({ title, description, action, backHref }: { title: string; description?: string; action?: React.ReactNode; backHref?: string }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backHref ? <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#087332]"><TbChevronLeft />Back</Link> : null}
        <h1 className="text-[27px] font-semibold tracking-[-0.035em] text-[#171b22]">{title}</h1>
        {description ? <p className="mt-1 text-[12px] text-[#717983]">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
