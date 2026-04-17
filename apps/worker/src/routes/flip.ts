import type { Hono } from "hono";
import type { Env } from "../lib/env";
import { errorResponse } from "../lib/errors";
import { buildBinaryResponse, inferFormat } from "../lib/response";
import { parseFlipOptions, parseMultipart, requireOptions } from "../lib/validation";
import type { ImageProcessor } from "../lib/processor";

export const registerFlipRoute = (app: Hono<{ Bindings: Env }>, processor: ImageProcessor) => {
  app.post("/api/flip", async (c) => {
    try {
      const { file, options } = await parseMultipart(c.req.raw, c.env);
      const parsed = parseFlipOptions(requireOptions(options, "flip"));
      const input = new Uint8Array(await file.arrayBuffer());
      const result = await processor.flip(input, parsed);
      return buildBinaryResponse(file, result, inferFormat(file));
    } catch (error) {
      return errorResponse(error);
    }
  });
};
