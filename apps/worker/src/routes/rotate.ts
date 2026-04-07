import type { Hono } from "hono";
import { errorResponse } from "../lib/errors";
import { buildBinaryResponse, inferFormat } from "../lib/response";
import { parseMultipart, parseRotateOptions, requireOptions } from "../lib/validation";
import type { ImageProcessor } from "../lib/processor";

export const registerRotateRoute = (app: Hono, processor: ImageProcessor) => {
  app.post("/api/rotate", async (c) => {
    try {
      const { file, options } = await parseMultipart(c.req.raw, c.env);
      const parsed = parseRotateOptions(requireOptions(options, "rotate"));
      const input = new Uint8Array(await file.arrayBuffer());
      const result = await processor.rotate(input, parsed);
      return buildBinaryResponse(file, result, inferFormat(file));
    } catch (error) {
      return errorResponse(error);
    }
  });
};
