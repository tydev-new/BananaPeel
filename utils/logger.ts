export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    NONE = 'NONE'
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.WARN]: 3,
    [LogLevel.ERROR]: 4,
    [LogLevel.NONE]: 5,
};

class LoggerService {
    private level: LogLevel = LogLevel.INFO;
    private outputs: ((message: string) => void)[] = [console.log];
    private testHarnessOutput: ((message: string) => void) | null = null;

    private formatMessage(level: LogLevel, source: string, message: string): string {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        return `${timestamp} [${level}] [${source}] ${message}`;
    }

    private log(level: LogLevel, source: string, message: string) {
        if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[this.level]) {
            return;
        }
        
        const formattedMessage = this.formatMessage(level, source, message);

        if (this.testHarnessOutput) {
            // If test harness is active, it's the exclusive consumer
            this.testHarnessOutput(formattedMessage);
        } else {
            // Otherwise, log to all regular outputs
            this.outputs.forEach(fn => fn(formattedMessage));
        }
    }

    public setLevel(level: LogLevel) {
        this.level = level;
    }
    
    public setTestHarnessLogger(outputFn: ((message: string) => void) | null) {
        this.testHarnessOutput = outputFn;
    }

    public addOutput(outputFn: (message: string) => void) {
        if (!this.outputs.includes(outputFn)) {
            this.outputs.push(outputFn);
        }
    }

    public removeOutput(outputFn: (message: string) => void) {
        this.outputs = this.outputs.filter(fn => fn !== outputFn);
    }

    public debug(source: string, message: string) {
        this.log(LogLevel.DEBUG, source, message);
    }

    public info(source: string, message: string) {
        this.log(LogLevel.INFO, source, message);
    }

    public warn(source: string, message: string) {
        this.log(LogLevel.WARN, source, message);
    }

    public error(source: string, message: string) {
        this.log(LogLevel.ERROR, source, message);
    }
}

export const logger = new LoggerService();