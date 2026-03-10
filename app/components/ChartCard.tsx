export default function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-apple-mist p-5 shadow-apple-xs">
      <h3 className="text-sm font-semibold text-apple-charcoal">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-apple-smoke mt-1 mb-3">
          {description}
        </p>
      )}

      <div className="w-full h-[250px]">{children}</div>
    </div>
  );
}