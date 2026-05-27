import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getRequestId } from '../context/request-context';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId =
      getRequestId() ?? (req.headers['x-request-id'] as string) ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const o = body as Record<string, unknown>;
        message = Array.isArray(o.message)
          ? (o.message as string[]).map(String).join(', ')
          : typeof o.message === 'string'
            ? o.message
            : message;
        code = (o.error as string) ?? code;
        details = o;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd && exception instanceof Error && exception.stack) {
      this.logger.error(exception.stack);
    } else {
      this.logger.warn(`${status} ${message} [${requestId}]`);
    }

    res.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(isProd ? {} : { details }),
      },
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
