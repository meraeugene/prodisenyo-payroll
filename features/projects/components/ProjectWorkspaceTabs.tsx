"use client";

export default function ProjectWorkspaceTabs<Tab extends string>({
  tabs,
  activeTab,
  disabled,
  onSelect,
}: {
  tabs: readonly Tab[];
  activeTab: Tab;
  disabled: boolean;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((item) => {
        const isActive = activeTab === item;
        return (
          <button
            type="button"
            key={item}
            onClick={() => onSelect(item)}
            aria-current={isActive ? "page" : undefined}
            disabled={disabled}
            className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize transition ${
              isActive
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"
            } disabled:cursor-wait`}
          >
            {item}
          </button>
        );
      })}
    </nav>
  );
}
