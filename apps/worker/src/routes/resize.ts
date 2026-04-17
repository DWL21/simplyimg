import type { Hono } from "hono";
import type { Env } from "../lib/env";
import { errorResponse } from "../lib/errors";
import { buildBinaryResponse, inferFormat } from "../lib/response";
import { parseMultipart, parseResizeOptions, requireOptions } from "../lib/validation";
import type { ImageProcessor } from "../lib/processor";

export const registerResizeRoute = (app: Hono<{ Bindings: Env }>, processor: ImageProcessor) => {
  app.post("/api/resize", async (c) => {
    try {
      const { file, options } = await parseMultipart(c.req.raw, c.env);
      const parsed = parseResizeOptions(requireOptions(options, "resize"));
      const input = new Uint8Array(await file.arrayBuffer());
      const result = await processor.resize(input, parsed);
      return buildBinaryResponse(file, result, inferFormat(file));
    } catch (error) {
      return errorResponse(error);
    }
  });
};
