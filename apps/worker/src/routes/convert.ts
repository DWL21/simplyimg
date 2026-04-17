import type { Hono } from "hono";
import type { Env } from "../lib/env";
import { errorResponse } from "../lib/errors";
import { buildBinaryResponse } from "../lib/response";
import { parseConvertOptions, parseMultipart, requireOptions } from "../lib/validation";
import type { ImageProcessor } from "../lib/processor";

export const registerConvertRoute = (app: Hono<{ Bindings: Env }>, processor: ImageProcessor) => {
  app.post("/api/convert", async (c) => {
    try {
      const { file, options } = await parseMultipart(c.req.raw, c.env);
      const parsed = parseConvertOptions(requireOptions(options, "convert"));
      const input = new Uint8Array(await file.arrayBuffer());
      const result = await processor.convert(input, parsed);
      return buildBinaryResponse(file, result, parsed.to);
    } catch (error) {
      return errorResponse(error);
    }
  });
};
