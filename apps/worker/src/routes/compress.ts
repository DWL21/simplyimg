import type { Hono } from "hono";
import type { Env } from "../lib/env";
import { errorResponse } from "../lib/errors";
import { buildBinaryResponse, inferFormat } from "../lib/response";
import { parseCompressOptions, parseMultipart, requireOptions } from "../lib/validation";
import type { ImageProcessor } from "../lib/processor";

export const registerCompressRoute = (app: Hono<{ Bindings: Env }>, processor: ImageProcessor) => {
  app.post("/api/compress", async (c) => {
    try {
      const { file, options } = await parseMultipart(c.req.raw, c.env);
      const parsed = parseCompressOptions(requireOptions(options, "compress"));
      const input = new Uint8Array(await file.arrayBuffer());
      const result = await processor.compress(input, parsed);
      return buildBinaryResponse(file, result, parsed.format ?? inferFormat(file));
    } catch (error) {
      return errorResponse(error);
    }
  });
};
