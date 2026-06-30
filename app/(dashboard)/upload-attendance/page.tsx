"use client";

import { saveAttendanceImportAction } from "@/actions/attendance";
import DashboardPageHero from "@/components/DashboardPageHero";
import UploadZone from "@/components/UploadZone";
import { useAppState } from "@/features/app/AppStateProvider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function UploadAttendancePage() {
  const {
    uploadedFiles,
    setUploadedFiles,
    setCurrentAttendanceImportId,
    setCurrentPayrollRunMeta,
    handleParsed,
    handleReset,
  } = useAppState();
  const router = useRouter();

  async function handleUploadParsed(...args: Parameters<typeof handleParsed>) {
    const [result] = args;

    const saveResult = await saveAttendanceImportAction({
      fileNames: uploadedFiles.map((file) => file.name),
      result,
    });

    setCurrentAttendanceImportId(saveResult.importId);
    setCurrentPayrollRunMeta({ id: null, status: null });
    handleParsed(result);
    toast.success("Attendance reports ready for review.", {
      description: "Your uploaded files were processed and saved.",
    });
    router.refresh();
    router.replace("/review-attendance");
  }

  return (
    <div className="space-y-4 p-0 sm:p-4">
      <DashboardPageHero
        isUploadAttendance
        eyebrow="Attendance"
        title="Upload Attendance"
        description="Import biometric attendance files and sync them into the payroll workspace."
      />
      <section className="rounded-none border border-apple-mist bg-white p-5 shadow-[0_10px_30px_rgba(24,83,43,0.07)] sm:rounded-[14px]">
        <UploadZone
          files={uploadedFiles}
          onFilesChange={setUploadedFiles}
          onParsed={handleUploadParsed}
          onClearWorkspace={handleReset}
        />
      </section>
    </div>
  );
}
