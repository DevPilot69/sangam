import {
  BadGatewayException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import type { EnvVars } from '../../config/validate-env';

@Injectable()
export class DemoSimulationInterceptor implements NestInterceptor {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const simulateError = req.headers?.['x-demo-error'];
    if (simulateError === '500' || simulateError === '502') {
      throw new BadGatewayException('Simulated API failure (x-demo-error)');
    }

    const delayMs = this.config.get('DEMO_LATENCY_MS', { infer: true }) ?? 0;
    if (delayMs <= 0) return next.handle();

    return new Observable((subscriber) => {
      const timer = setTimeout(() => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      }, delayMs);
      return () => clearTimeout(timer);
    });
  }
}
