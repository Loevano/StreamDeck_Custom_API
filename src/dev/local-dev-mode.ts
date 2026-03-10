import readline from "node:readline";
import { logger } from "../logger";
import { RuntimeController } from "../runtime/runtime-controller";
import { StreamDeckIncomingMessage } from "../types";

const DEV_COLUMNS = 5;
const DEV_ROWS = 3;
const DEV_DEVICE_ID = "dev-device";

function createContext(row: number, column: number): string {
  return `dev-${row}-${column}`;
}

export async function runLocalDevMode(controller: RuntimeController): Promise<void> {
  logger.info("Running local dev mode", {
    columns: DEV_COLUMNS,
    rows: DEV_ROWS,
    device: DEV_DEVICE_ID
  });

  await controller.handleMessage({
    event: "deviceDidConnect",
    device: DEV_DEVICE_ID,
    payload: {
      size: {
        columns: DEV_COLUMNS,
        rows: DEV_ROWS
      }
    }
  });

  for (let row = 0; row < DEV_ROWS; row += 1) {
    for (let column = 0; column < DEV_COLUMNS; column += 1) {
      await controller.handleMessage({
        event: "willAppear",
        device: DEV_DEVICE_ID,
        context: createContext(row, column),
        payload: {
          coordinates: {
            row,
            column
          }
        }
      });
    }
  }

  logger.info("Dev controls: press <row> <column> | refresh | quit");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed === "quit" || trimmed === "exit") {
      rl.close();
      controller.stop();
      process.exit(0);
      return;
    }

    if (trimmed === "refresh") {
      await controller.start();
      return;
    }

    const tokens = trimmed.split(/\s+/);
    if (tokens[0] === "press" && tokens.length === 3) {
      const row = Number(tokens[1]);
      const column = Number(tokens[2]);
      if (!Number.isFinite(row) || !Number.isFinite(column)) {
        logger.warn("Usage: press <row> <column>");
        return;
      }

      const context = createContext(row, column);
      const message: StreamDeckIncomingMessage = {
        event: "keyDown",
        context,
        device: DEV_DEVICE_ID,
        payload: {
          coordinates: {
            row,
            column
          }
        }
      };

      await controller.handleMessage(message);
      return;
    }

    logger.warn("Unknown command", trimmed);
  });
}
