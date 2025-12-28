type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
    [key: string]: unknown;
}

class Logger {
    private env: string;

    constructor(environment: string = "development") {
        this.env = environment;
    }

    private log(level: LogLevel, message: string, context?: LogContext): void {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            environment: this.env,
            ...context,
        };

        console[level === "debug" ? "log" : level](JSON.stringify(logEntry));
    }

    debug(message: string, context?: LogContext): void {
        this.log("debug", message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log("info", message, context);
    }

    warn(message: string, context?: LogContext): void {
        this.log("warn", message, context);
    }

    error(message: string, error?: Error, context?: LogContext): void {
        this.log("error", message, {
            ...context,
            error: error
                ? {
                      name: error.name,
                      message: error.message,
                      stack: error.stack,
                  }
                : undefined,
        });
    }
}

export const logger = new Logger();
