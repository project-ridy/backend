import { Injectable } from '@nestjs/common';

export type LogLevel = 'info' | 'warn' | 'error';

export type StructuredLogInput = {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
};

@Injectable()
export class StructuredLoggerService {
  log(input: StructuredLogInput): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const payload = {
      level: input.level,
      message: input.message,
      timestamp: new Date().toISOString(),
      ...input.context,
    };

    if (input.level === 'error') {
      console.error(JSON.stringify(payload));
      return;
    }
    if (input.level === 'warn') {
      console.warn(JSON.stringify(payload));
      return;
    }
    console.log(JSON.stringify(payload));
  }
}
