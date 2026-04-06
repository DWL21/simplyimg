import type { Hono } from "hono";
import { errorResponse } from "../lib/errors";
import { buildBinaryResponse, inferFormat } from "../lib/response";
import { parseCropOptions, parseMultipart, requireOptions } from "../lib/validation";
import type { ImageProcessor } from "../lib/processor";

export const registerCropRoute = (app: Hono, processor: ImageProcessor) => {
  app.post("/api/crop", async (c) => {
    try {
      const { file, options } = await parseMultipart(c.req.raw);
      const parsed = parseCropOptions(requireOptions(options, "crop"));
      const input = new Uint8Array(await file.arrayBuffer());
      const result = await processor.crop(input, parsed);
      return buildBinaryResponse(file, result, inferFormat(file));
    } catch (error) {
      return errorResponse(error);
    }
  });
};
