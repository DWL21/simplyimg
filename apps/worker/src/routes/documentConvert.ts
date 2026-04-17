import type { Hono } from "hono";
import type { Env } from "../lib/env";
import { convertDocumentToPdf } from "../../../../packages/document-processor/src/index";
import { errorResponse } from "../lib/errors";
import { buildPdfResponse, inferDocumentFormat } from "../lib/response";
import { parseDocumentMultipart, requireDocumentFormat } from "../lib/validation";

export const registerDocumentConvertRoute = (app: Hono<{ Bindings: Env }>) => {
  app.post("/api/document/convert", async (c) => {
    try {
      const file = await parseDocumentMultipart(c.req.raw, c.env);
      const format = requireDocumentFormat(inferDocumentFormat(file));
      const input = new Uint8Array(await file.arrayBuffer());
      const result = await convertDocumentToPdf(input, file.name, format);
      return buildPdfResponse(file, result);
    } catch (error) {
      return errorResponse(error);
    }
  });
};
