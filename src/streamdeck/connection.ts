import WebSocket from "ws";
import { logger } from "../logger";
import { StreamDeckIncomingMessage, StreamDeckOutgoingMessage } from "../types";

export interface StreamDeckRegistrationParams {
  port: number;
  pluginUUID: string;
  registerEvent: string;
  info?: string;
}

export function parseRegistrationArgs(argv: string[]): StreamDeckRegistrationParams | null {
  const values: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("-")) {
      continue;
    }

    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("-")) {
      continue;
    }

    values[token.slice(1)] = nextValue;
    index += 1;
  }

  const port = Number(values.port);
  if (!Number.isFinite(port) || !values.pluginUUID || !values.registerEvent) {
    return null;
  }

  return {
    port,
    pluginUUID: values.pluginUUID,
    registerEvent: values.registerEvent,
    info: values.info
  };
}

export class StreamDeckConnection {
  private socket: WebSocket | null = null;

  constructor(private readonly params: StreamDeckRegistrationParams) {}

  connect(onMessage: (message: StreamDeckIncomingMessage) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${this.params.port}`);
      this.socket = socket;

      socket.on("open", () => {
        this.send({
          event: this.params.registerEvent,
          uuid: this.params.pluginUUID
        });

        logger.info("Connected to Stream Deck WebSocket", { port: this.params.port });
        resolve();
      });

      socket.on("message", (rawMessage) => {
        try {
          const parsed = JSON.parse(rawMessage.toString("utf8")) as StreamDeckIncomingMessage;
          onMessage(parsed);
        } catch (error) {
          logger.warn("Failed to parse Stream Deck payload", error);
        }
      });

      socket.on("close", () => {
        logger.warn("Stream Deck socket closed");
      });

      socket.on("error", (error) => {
        logger.error("Stream Deck socket error", error);
        reject(error);
      });
    });
  }

  send(message: StreamDeckOutgoingMessage | Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  getGlobalSettings(): void {
    this.send({
      event: "getGlobalSettings",
      context: this.params.pluginUUID
    });
  }

  setTitle(context: string, title: string): void {
    this.send({
      event: "setTitle",
      context,
      payload: {
        title,
        target: 0
      }
    });
  }

  setImage(context: string, image: string): void {
    this.send({
      event: "setImage",
      context,
      payload: {
        image,
        target: 0
      }
    });
  }

  showOk(context: string): void {
    this.send({
      event: "showOk",
      context
    });
  }

  showAlert(context: string): void {
    this.send({
      event: "showAlert",
      context
    });
  }
}
