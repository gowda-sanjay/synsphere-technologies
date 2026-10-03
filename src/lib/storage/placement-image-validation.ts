export const MAX_PLACEMENT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const imageTypes = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

type PlacementImageFile = Pick<File, "name" | "type" | "size" | "slice">;

function matchesImageSignature(extension: string, bytes: Uint8Array) {
  if (extension === "jpg" || extension === "jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === "png") {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (extension === "webp") {
    return bytes.length >= 12
      && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

export async function validatePlacementImageFile(file: PlacementImageFile): Promise<string | null> {
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  const expectedType = imageTypes[extension as keyof typeof imageTypes];
  if (!expectedType) return "Upload a JPEG, PNG, or WebP placement photo.";
  if (file.size <= 0) return "The selected image is empty.";
  if (file.size > MAX_PLACEMENT_IMAGE_SIZE_BYTES) return "Placement photos must be 5 MB or smaller.";
  if (file.type && file.type !== expectedType && !(expectedType === "image/jpeg" && file.type === "image/jpg")) {
    return "The image MIME type does not match its extension.";
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!matchesImageSignature(extension, bytes)) return "The file contents do not match a supported image format.";
  return null;
}

export function getPlacementImageContentType(fileName: string): string | null {
  const extension = fileName.split(".").at(-1)?.toLowerCase() ?? "";
  return imageTypes[extension as keyof typeof imageTypes] ?? null;
}

export function isPlacementImagePath(value: string): boolean {
  return /^placements\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i.test(value);
}
