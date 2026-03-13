type Props = {
  active?: boolean;
  payload?: any[];
  label?: string;
  unit?: string;
};

export default function ChartTooltip({ active, payload, label, unit }: Props) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white text-black p-3 rounded-xl shadow-xl border border-white/10 backdrop-blur-md">
        <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">
          {label}
        </p>

        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold">{payload[0].value}</span>

          <span className="text-[10px] opacity-80">{unit}</span>
        </div>
      </div>
    );
  }

  return null;
}
