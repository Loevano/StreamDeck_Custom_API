import { getInitialConfig } from "./config";
import { runLocalDevMode } from "./dev/local-dev-mode";
import { logger } from "./logger";
import { RuntimeController } from "./runtime/runtime-controller";
import { StreamDeckConnection, parseRegistrationArgs } from "./streamdeck/connection";

async function bootstrap(): Promise<void> {
  const initialConfig = getInitialConfig();

  const args = parseRegistrationArgs(process.argv.slice(2));

  if (!args || process.argv.includes("--dev")) {
    logger.info("No Stream Deck registration arguments found; starting local dev mode", {
      apiBaseUrl: initialConfig.apiBaseUrl
    });

    const devRenderer = {
      setTitle: (context: string, title: string): void => {
        logger.info("[dev:setTitle]", { context, title });
      },
      setImage: (context: string, image: string): void => {
        logger.info("[dev:setImage]", { context, imagePrefix: image.slice(0, 48) });
      }
    };

    const controller = new RuntimeController(initialConfig, devRenderer);
    await controller.start();
    await runLocalDevMode(controller);
    return;
  }

  const connection = new StreamDeckConnection(args);
  const controller = new RuntimeController(initialConfig, {
    setTitle: (context, title) => connection.setTitle(context, title),
    setImage: (context, image) => connection.setImage(context, image)
  });

  await connection.connect((message) => {
    void controller.handleMessage(message);
  });

  connection.getGlobalSettings();
  await controller.start();

  logger.info("Plugin started", {
    apiBaseUrl: initialConfig.apiBaseUrl,
    layoutPollIntervalMs: initialConfig.layoutPollIntervalMs,
    statePollIntervalMs: initialConfig.statePollIntervalMs
  });

  process.on("SIGINT", () => {
    controller.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    controller.stop();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  logger.error("Plugin bootstrap failed", error);
  process.exit(1);
});
