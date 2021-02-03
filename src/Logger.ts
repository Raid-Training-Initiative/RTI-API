enum Severity {
    Debug = "Debug",
    Info = "Info",
    Warn = "Warn",
    Error = "Error",
}

export default class Logger {
    public static Log(severity: Severity, msg: string) {
        const timeStr = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
        const formattedMsg = `[${timeStr}][${severity}] ${msg}`;
        console.log(formattedMsg);
    }
    
    public static LogError(severity: Severity, error: Error) {
        Logger.Log(severity, `err: ${error.name} - ${error.message} | ${error.stack}`);
    }
}