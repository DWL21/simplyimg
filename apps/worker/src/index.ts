import { Hono } from "hono";
import { cors } from "hono/cors";
import { createImageProcessor } from "./lib/processor";
import { errorResponse } from "./lib/errors";
import type { Env } from "./lib/env";
import { registerCompressRoute } from "./routes/compress";
import { registerConvertRoute } from "./routes/convert";
import { registerCropRoute } from "./routes/crop";
import { registerDocumentConvertRoute } from "./routes/documentConvert";
import { registerFlipRoute } from "./routes/flip";
import { registerInfoRoute } from "./routes/info";
import { registerResizeRoute } from "./routes/resize";
import { registerRotateRoute } from "./routes/rotate";
import { registerAuthRoutes } from "./routes/auth";

const app = new Hono<{ Bindings: Env }>();
const processor = createImageProcessor();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

registerAuthRoutes(app);
registerInfoRoute(app, processor);
registerCompressRoute(app, processor);
registerResizeRoute(app, processor);
registerConvertRoute(app, processor);
registerRotateRoute(app, processor);
registerFlipRoute(app, processor);
registerCropRoute(app, processor);
registerDocumentConvertRoute(app);

app.notFound((c) => c.json({ error: "Not found", code: "NOT_FOUND" }, 404));
app.onError((err, c) => {
  console.error(err);
  return errorResponse(err);
});

export default app;
