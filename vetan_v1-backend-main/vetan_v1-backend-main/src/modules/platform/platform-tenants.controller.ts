import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PlatformAuthGuard } from './guards/platform-auth.guard';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import { UpdateTenantOperationalStatusDto } from './dto/update-tenant-operational-status.dto';
import { PlatformTenantsService } from './platform-tenants.service';

class SlugCheckQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(48)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens',
  })
  slug!: string;
}

@ApiTags('platform')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), PlatformAuthGuard)
@Controller('platform/tenants')
export class PlatformTenantsController {
  constructor(private readonly tenants: PlatformTenantsService) {}

  @Get('check-slug')
  checkSlug(@Query() query: SlugCheckQueryDto) {
    return this.tenants.isSlugAvailable(query.slug);
  }

  @Post()
  provision(@Body() dto: ProvisionTenantDto) {
    return this.tenants.provision(dto);
  }

  @Patch(':id/company-code')
  updateCompanyCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { companyCode: string },
  ) {
    return this.tenants.updateCompanyCode(id, body.companyCode);
  }

  @Patch(':id/operational-status')
  updateOperationalStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantOperationalStatusDto,
  ) {
    return this.tenants.updateOperationalStatus(id, dto.operationalStatus);
  }

  @Get(':id/invoices/:invoiceId/download')
  async downloadInvoice(
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Res() res: Response,
  ) {
    const file = await this.tenants.getInvoiceDownload(tenantId, invoiceId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.html);
  }
}
