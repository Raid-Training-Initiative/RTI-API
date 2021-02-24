import HTTPException from "../exceptions/base/HTTPException";

export enum Severity {
    Debug = "Debug", // For fine-grained information that is useful to debug the API.
    Info = "Info", // For high-level logs that show the progress/flow of the API.
    Warn = "Warn", // For potentially harmful situations or malformed requests to the API.
    Error = "Error", // For errors that indicate that something went wrong within the API.
}

export class Logger {
    /**
     * The main logging method which appends a log message with a date and severity.
     * @param severity The type of severity of the log.
     * @param message The message to output in the log.
     */
    public static log(severity: Severity, message: string) {
        const timeStr = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
        const formattedMsg = `[${timeStr}][${severity}]${severity.length == 4 ? " " : ""} ${message}`;
        console.log(formattedMsg);
    }

    /**
     * Helper logger specifically for requests.
     * @param severity The type of severity of the log.
     * @param message The message to output in the log.
     */
    public static log_request(severity: Severity, requestTimestamp: string, message: string) {
        const timeStr = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
        const formattedMsg = `[${timeStr}][${severity}]${severity.length == 4 ? " " : ""} [${requestTimestamp}] ${message}`;
        console.log(formattedMsg);
    }
    
    /**
     * Helper logger specifically for HTTP errors.
     * @param severity The severity of the error.
     * @param error The error to output in the log.
     */
    public static log_http_error(severity: Severity, requestTimestamp: string, error: HTTPException) {
        Logger.log_request(severity, requestTimestamp, `${error.name} - ${error.message} | Status code: ${error.status}`);
    }

    /**
     * Helper logger for errors not caught as HTTP errors.
     * @param severity The severity of the error.
     * @param error The error to output in the log.
     */
    public static log_error(severity: Severity, error: Error) {
        Logger.log(severity, `Error: ${error.name} - ${error.message} | ${error.stack}`);
    }
}