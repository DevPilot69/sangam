import { Global, Module } from '@nestjs/common';
import { PermissionsBootstrapService } from './permissions-bootstrap.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, PermissionsBootstrapService],
  exports: [PrismaService],
})
export class PrismaModule {}
