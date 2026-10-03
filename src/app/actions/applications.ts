"use server";

import { revalidatePath } from "next/cache";
import { createApplicationForCurrentUser } from "@/lib/services/applications";

export async function submitApplication(jobId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId)) {
    return { kind: "job-unavailable" as const };
  }

  const result = await createApplicationForCurrentUser(jobId);
  if (result.kind === "success") {
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    revalidatePath(`/jobs/${jobId}`);
  }
  return result;
}