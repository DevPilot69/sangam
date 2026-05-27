import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ensurePermissions } from './ensure-permissions';

@Injectable()
export class PermissionsBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const rows = await ensurePermissions(this.prisma);
    this.logger.log(`Permissions ready (${rows.length} codes)`);
  }
}
