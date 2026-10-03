export const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const imageMimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function validateProfileImageFile(file: Pick<File, "name" | "type" | "size">): string | null {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  const expectedMime = extension ? imageMimeTypes[extension] : undefined;

  if (!extension || !expectedMime) return "Upload a JPEG, PNG, or WebP profile image.";
  if (file.type && file.type !== expectedMime && file.type !== "image/jpg") return "The file type does not match its extension.";
  if (file.size <= 0) return "The selected image is empty.";
  if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) return "Profile images must be 5 MB or smaller.";
  return null;
}
