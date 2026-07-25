/**
 * Security Utility: Structured Logger
 * Safe, level-based logging with automatic key masking.
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private isProduction = import.meta.env.PROD;

  private maskSensitive(msg: string): string {
    if (!msg || typeof msg !== 'string') return msg;
    // Mask Gemini API keys (AIza...) and Groq keys (gsk_...)
    return msg
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, 'AIzaSy***MASKED***')
      .replace(/gsk_[A-Za-z0-9_-]{45,}/g, 'gsk_***MASKED***');
  }

  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const maskedMsg = this.maskSensitive(message);
    let output = `[${timestamp}] [${level}] ${maskedMsg}`;
    if (context) {
      try {
        const maskedContext = this.maskSensitive(JSON.stringify(context));
        output += ` | Context: ${maskedContext}`;
      } catch {
        output += ` | Context: [Unserializable]`;
      }

    }
    return output;
  }

  public debug(message: string, context?: any): void {
    if (!this.isProduction) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  public info(message: string, context?: any): void {
    console.info(this.formatMessage('INFO', message, context));
  }

  public warn(message: string, context?: any): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  public error(message: string, error?: any): void {
    console.error(this.formatMessage('ERROR', message, error));
  }
}

export const logger = new Logger();
