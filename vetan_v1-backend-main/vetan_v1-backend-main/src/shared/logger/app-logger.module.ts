import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { requestContext } from '../context/request-context';

const alsFields = winston.format((info) => {
  const store = requestContext.getStore();
  if (store?.requestId) info.requestId = store.requestId;
  if (store?.tenantId) info.tenantId = store.tenantId;
  if (store?.userId) info.userId = store.userId;
  return info;
});

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            alsFields(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class AppLoggerModule {}
