import type { Hono } from "hono";
import { infoResponse } from "../lib/response";
import { parseFileMultipart } from "../lib/validation";
import type { ImageProcessor } from "../lib/processor";
import { errorResponse } from "../lib/errors";

export const registerInfoRoute = (app: Hono, processor: ImageProcessor) => {
  app.post("/api/info", async (c) => {
    try {
      const file = await parseFileMultipart(c.req.raw, c.env);
      const result = await processor.info(new Uint8Array(await file.arrayBuffer()));
      return infoResponse(result);
    } catch (error) {
      return errorResponse(error);
    }
  });
};
