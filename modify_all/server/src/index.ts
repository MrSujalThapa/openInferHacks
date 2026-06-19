import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { connectMongo } from "./db/mongo.js";
import { ensureIndexes } from "./db/repositories.js";
import { customizationsRouter } from "./routes/customizations.js";
import { healthRouter } from "./routes/health.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRouter);
app.use("/api/customizations", customizationsRouter);

app.use((_request, response) => {
  response.status(404).json({ ok: false, error: "Not found" });
});

async function startServer(): Promise<void> {
  try {
    await connectMongo(config.mongodbUri, config.mongodbDb);

    if (config.mongodbUri) {
      await ensureIndexes();
    }
  } catch (error) {
    console.warn("MongoDB bootstrap failed; health endpoint will report the error.", error);
  }

  app.listen(config.port, () => {
    console.log(`Genie backend listening on http://localhost:${config.port}`);
  });
}

void startServer();
