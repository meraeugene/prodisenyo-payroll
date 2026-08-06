export default function ProjectPreviewNotice({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
      {label} Changes here are not stored in Supabase yet.
    </div>
  );
}
