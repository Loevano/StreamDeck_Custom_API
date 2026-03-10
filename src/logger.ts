function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

function log(level: "INFO" | "WARN" | "ERROR", args: unknown[]): void {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] [${level}] ${formatArgs(args)}`;
  if (level === "ERROR") {
    console.error(line);
    return;
  }
  if (level === "WARN") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info: (...args: unknown[]): void => log("INFO", args),
  warn: (...args: unknown[]): void => log("WARN", args),
  error: (...args: unknown[]): void => log("ERROR", args)
};
