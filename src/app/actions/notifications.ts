"use server";

import { revalidatePath } from "next/cache";
import { markMyNotificationRead } from "@/lib/services/notifications";

export async function markNotificationRead(id: string) {
  const result = await markMyNotificationRead(id);
  if (result.data) {
    revalidatePath("/notifications");
    revalidatePath("/dashboard");
  }
  return result;
}
