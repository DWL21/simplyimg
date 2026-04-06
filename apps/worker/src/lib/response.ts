import type { DocumentFormat, ImageInfo, ImageFormat } from "./types";

export const getOutputFilename = (inputName: string | undefined, format: ImageFormat): string => {
  const base = inputName?.replace(/\.[^.]+$/, "") || "result";
  return `${base}.${format}`;
};

export const formatToMimeType = (format: ImageFormat): string => {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
  }
};

export const inferFormat = (file: File): ImageFormat => {
  const type = file.type.toLowerCase();
  if (type.includes("jpeg") || type.includes("jpg")) return "jpeg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";

  const match = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  switch (match?.[1]) {
    case "jpg":
    case "jpeg":
      return "jpeg";
    case "png":
      return "png";
    case "webp":
      return "webp";
    case "gif":
      return "gif";
    default:
      return "png";
  }
};

export const buildBinaryResponse = (
  file: File,
  result: Uint8Array,
  format: ImageFormat,
): Response => {
  const payload = new Uint8Array(result.byteLength);
  payload.set(result);
  const headers = new Headers({
    "Content-Type": formatToMimeType(format),
    "Content-Disposition": `attachment; filename="${getOutputFilename(file.name, format)}"`,
    "X-Original-Size": String(file.size),
    "X-Result-Size": String(result.byteLength),
  });

  return new Response(payload, {
    status: 200,
    headers,
  });
};

export const infoResponse = (info: ImageInfo): Response =>
  Response.json(info, { status: 200 });

export const getPdfFilename = (inputName: string | undefined): string => {
  const base = inputName?.replace(/\.[^.]+$/, "") || "result";
  return `${base}.pdf`;
};

export const inferDocumentFormat = (file: File): DocumentFormat | null => {
  const loweredType = file.type.toLowerCase();
  if (loweredType.includes("markdown")) return "md";
  if (
    loweredType.includes(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
  ) {
    return "docx";
  }

  const match = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  switch (match?.[1]) {
    case "md":
    case "markdown":
      return "md";
    case "docx":
      return "docx";
    default:
      return null;
  }
};

export const buildPdfResponse = (file: File, result: Uint8Array): Response => {
  const payload = new Uint8Array(result.byteLength);
  payload.set(result);
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${getPdfFilename(file.name)}"`,
    "X-Original-Size": String(file.size),
    "X-Result-Size": String(result.byteLength),
  });

  return new Response(payload, {
    status: 200,
    headers,
  });
};
