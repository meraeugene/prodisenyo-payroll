interface LandingSectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  inverse?: boolean;
}

export default function LandingSectionHeading({
  eyebrow,
  title,
  description,
  inverse = false,
}: LandingSectionHeadingProps) {
  return (
    <div className="mx-auto max-w-[720px] text-center">
      <p
        className={[
          "text-xs font-bold uppercase tracking-[0.2em]",
          inverse ? "text-emerald-200" : "text-emerald-700",
        ].join(" ")}
      >
        {eyebrow}
      </p>
      <h2
        className={[
          "mt-3 text-balance text-3xl font-bold tracking-[-0.04em] sm:text-[40px]",
          inverse ? "text-white" : "text-[#103d39]",
        ].join(" ")}
      >
        {title}
      </h2>
      <p
        className={[
          "mt-4 text-[15px] leading-7",
          inverse ? "text-emerald-50/75" : "text-slate-600",
        ].join(" ")}
      >
        {description}
      </p>
    </div>
  );
}
