import "dotenv/config";
import { createApp } from "./app.js";
import { validateEnvironment } from "./config/environment.js";
import { logger } from "./utils/logger.js";

async function main() {
  try {
    const env = validateEnvironment(process.env as Record<string, unknown>);
    const app = await createApp({ env });

    await app.ready();

    const port = parseInt(process.env.PORT || "8080", 10);
    const host = "0.0.0.0"; // Required for Cloud Run

    await app.listen({ port, host });
    logger.info(`Server listening`, { port, host });

    const shutdown = async (signal: string) => {
      try {
        logger.info(`Received ${signal}, shutting down...`);
        await app.close();
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown", err as Error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server", error as Error);
    process.exit(1);
  }
}

main();
