export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024;

export const resumeMimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function getResumeMimeType(file: Pick<File, "name" | "type">): string | null {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (!extension || !(extension in resumeMimeTypes)) return null;

  const expectedMime = resumeMimeTypes[extension];
  const actualType = file.type?.trim().toLowerCase();

  if (!actualType) return expectedMime;
  if (actualType === expectedMime || actualType === "application/octet-stream") return expectedMime;
  return expectedMime;
}

export function validateResumeFile(file: Pick<File, "name" | "type" | "size">): string | null {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (!extension || !(extension in resumeMimeTypes)) return "Choose a PDF, DOC, or DOCX resume.";

  const actualType = file.type?.trim().toLowerCase();
  const expectedMime = resumeMimeTypes[extension];
  if (actualType && actualType !== expectedMime && actualType !== "application/octet-stream") {
    return "The file type does not match its extension.";
  }

  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_RESUME_SIZE_BYTES) return "Resumes must be 10 MB or smaller.";
  return null;
}