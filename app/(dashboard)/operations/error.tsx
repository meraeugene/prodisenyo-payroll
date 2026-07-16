"use client";

import OperationsErrorState from "@/features/operations/components/OperationsErrorState";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <OperationsErrorState reset={reset} />; }
