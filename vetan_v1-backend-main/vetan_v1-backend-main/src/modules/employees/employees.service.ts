import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { EmployeeCredentialsService } from '../auth/employee-credentials.service';
import { parseISODateOnly } from '../tenant/org/date-parse';
import {
  buildPaginatedResponse,
  parsePaginationQuery,
} from '../../shared/utils/pagination';
import { BulkEmployeeImportRowDto } from './dto/bulk-import-employees.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees.query.dto';
import { UpdateBankDetailsDto } from './dto/update-bank-details.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const listSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  status: true,
  departmentId: true,
  designationId: true,
  dateOfJoining: true,
  ctcAnnual: true,
  createdAt: true,
  deletedAt: true,
  department: { select: { id: true, name: true, code: true } },
  designation: { select: { id: true, title: true } },
} as const;

const detailSelectBase = {
  id: true,
  tenantId: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  email: true,
  status: true,
  departmentId: true,
  designationId: true,
  dateOfJoining: true,
  ctcAnnual: true,
  pan: true,
  bankName: true,
  bankAccount: true,
  ifsc: true,
  salaryPaymentMethod: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  department: { select: { id: true, name: true, code: true } },
  designation: { select: { id: true, title: true } },
} as const;

function maskPan(pan: string | null): string | null {
  if (!pan || pan.length < 10) return pan ? '**********' : null;
  return `${pan.slice(0, 3)}*****${pan.slice(8)}`;
}

function maskBank(acct: string | null): string | null {
  if (!acct || acct.length < 4) return acct ? '****' : null;
  return `****${acct.slice(-4)}`;
}

function toJsonValue(v: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeCredentials: EmployeeCredentialsService,
  ) {}

  private buildEmployeeListWhere(
    tenantId: string,
    query: ListEmployeesQueryDto,
  ): Prisma.EmployeeWhereInput {
    const record = query.record ?? 'active';
    const search = query.search?.trim();

    if (query.dateOfJoiningFrom && query.dateOfJoiningTo) {
      const a = parseISODateOnly(query.dateOfJoiningFrom).getTime();
      const b = parseISODateOnly(query.dateOfJoiningTo).getTime();
      if (a > b) {
        throw new BadRequestException(
          'dateOfJoiningFrom must be before or equal to dateOfJoiningTo',
        );
      }
    }

    const where: Prisma.EmployeeWhereInput = {
      tenantId,
      ...(record === 'active' ? { deletedAt: null } : {}),
      ...(record === 'deactivated' ? { deletedAt: { not: null } } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.designationId ? { designationId: query.designationId } : {}),
      ...(query.dateOfJoiningFrom || query.dateOfJoiningTo
        ? {
            dateOfJoining: {
              ...(query.dateOfJoiningFrom
                ? { gte: parseISODateOnly(query.dateOfJoiningFrom) }
                : {}),
              ...(query.dateOfJoiningTo
                ? { lte: parseISODateOnly(query.dateOfJoiningTo) }
                : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { employeeCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return where;
  }

  async list(tenantId: string, query: ListEmployeesQueryDto) {
    const { skip, take, page, pageSize } = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where = this.buildEmployeeListWhere(tenantId, query);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: listSelect,
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      employeeCode: r.employeeCode,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      status: r.status,
      departmentId: r.departmentId,
      designationId: r.designationId,
      dateOfJoining: r.dateOfJoining.toISOString().slice(0, 10),
      ctcAnnual: r.ctcAnnual === null ? null : Number(r.ctcAnnual.toString()),
      departmentName: r.department?.name ?? null,
      designationTitle: r.designation?.title ?? null,
      deactivatedAt: r.deletedAt?.toISOString() ?? null,
    }));

    return buildPaginatedResponse(items, total, page, pageSize);
  }

  async exportAll(
    tenantId: string,
    includeSensitive: boolean,
    query: ListEmployeesQueryDto,
  ) {
    const where = this.buildEmployeeListWhere(tenantId, query);
    const rows = await this.prisma.employee.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 5000,
      select: detailSelectBase,
    });

    return rows.map((r) => ({
      id: r.id,
      employeeCode: r.employeeCode,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      status: r.status,
      dateOfJoining: r.dateOfJoining.toISOString().slice(0, 10),
      departmentCode: r.department?.code ?? '',
      departmentName: r.department?.name ?? '',
      designationTitle: r.designation?.title ?? '',
      ctcAnnual:
        r.ctcAnnual === null ? null : Number(r.ctcAnnual.toString()),
      pan: includeSensitive ? r.pan : maskPan(r.pan),
      bankAccount: includeSensitive
        ? r.bankAccount
        : maskBank(r.bankAccount),
      ifsc:
        includeSensitive && r.ifsc
          ? r.ifsc
          : r.ifsc
            ? `****${r.ifsc.slice(-4)}`
            : null,
      deactivatedAt: r.deletedAt?.toISOString() ?? null,
    }));
  }

  async bulkImport(
    tenantId: string,
    rows: BulkEmployeeImportRowDto[],
  ): Promise<{
    created: number;
    failed: Array<{ index: number; message: string }>;
  }> {
    const failed: Array<{ index: number; message: string }> = [];
    let created = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        let departmentId: string | undefined;
        const deptCode = row.departmentCode?.trim();
        if (deptCode) {
          const id = await this.resolveDepartmentIdByCode(tenantId, deptCode);
          if (!id) {
            throw new BadRequestException(
              `Unknown department code: ${deptCode}`,
            );
          }
          departmentId = id;
        }

        let designationId: string | undefined;
        const desTitle = row.designationTitle?.trim();
        if (desTitle) {
          const id = await this.resolveDesignationIdByTitle(
            tenantId,
            desTitle,
          );
          if (!id) {
            throw new BadRequestException(
              `Unknown designation title: ${desTitle}`,
            );
          }
          designationId = id;
        }

        const codeRaw = row.employeeCode?.trim();
        const panNorm = row.pan?.replace(/\s/g, '').toUpperCase();
        const bankDigits = row.bankAccount?.replace(/\D/g, '') ?? '';
        const ifscNorm = row.ifsc
          ?.replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase();

        const dto: CreateEmployeeDto = {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email.trim().toLowerCase(),
          dateOfJoining: row.dateOfJoining.trim(),
          ...(codeRaw ? { employeeCode: codeRaw } : {}),
          ...(departmentId ? { departmentId } : {}),
          ...(designationId ? { designationId } : {}),
          ...(row.status !== undefined ? { status: row.status } : {}),
          ...(row.ctcAnnual !== undefined ? { ctcAnnual: row.ctcAnnual } : {}),
          ...(panNorm ? { pan: panNorm } : {}),
          ...(bankDigits ? { bankAccount: bankDigits } : {}),
          ...(ifscNorm ? { ifsc: ifscNorm } : {}),
        };

        await this.create(tenantId, dto);
        created++;
      } catch (err) {
        const message = this.exceptionToMessage(err);
        failed.push({ index: i, message });
      }
    }

    return { created, failed };
  }

  private exceptionToMessage(err: unknown): string {
    if (err instanceof HttpException) {
      const body = err.getResponse();
      if (typeof body === 'string') return body;
      if (typeof body === 'object' && body !== null) {
        const o = body as Record<string, unknown>;
        if (typeof o.message === 'string') return o.message;
        if (Array.isArray(o.message)) return o.message.join('; ');
      }
      return err.message;
    }
    if (err instanceof Error) return err.message;
    return 'Unknown error';
  }

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const emailNorm = dto.email.toLowerCase().trim();
    const dateOfJoining = parseISODateOnly(dto.dateOfJoining);

    if (dto.departmentId) {
      await this.assertDepartment(tenantId, dto.departmentId);
    }
    if (dto.designationId) {
      await this.assertDesignation(tenantId, dto.designationId);
    }

    const dupEmail = await this.prisma.employee.findFirst({
      where: { tenantId, email: emailNorm, deletedAt: null },
    });
    if (dupEmail) {
      throw new ConflictException('An employee with this email already exists');
    }

    let code = dto.employeeCode?.trim().toUpperCase();
    if (code) {
      const dupCode = await this.prisma.employee.findFirst({
        where: { tenantId, employeeCode: code, deletedAt: null },
      });
      if (dupCode) throw new ConflictException('Employee code already in use');
    } else {
      code = await this.generateUniqueEmployeeCode(tenantId);
    }

    const pan = dto.pan?.toUpperCase().trim();
    const ifsc = dto.ifsc?.toUpperCase().trim();
    const bankAccount = dto.bankAccount?.trim();
    const bankName = dto.bankName?.trim();

    const row = await this.prisma.employee.create({
      data: {
        tenantId,
        employeeCode: code,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: emailNorm,
        dateOfJoining,
        departmentId: dto.departmentId ?? null,
        designationId: dto.designationId ?? null,
        status: dto.status ?? EmploymentStatus.ACTIVE,
        ctcAnnual:
          dto.ctcAnnual !== undefined
            ? new Prisma.Decimal(dto.ctcAnnual)
            : null,
        pan: pan ?? null,
        bankName: bankName ?? null,
        bankAccount: bankAccount ?? null,
        ifsc: ifsc ?? null,
        salaryPaymentMethod: dto.salaryPaymentMethod ?? 'NEFT',
      } as Prisma.EmployeeUncheckedCreateInput,
      select: detailSelectBase,
    });

    const portalCredentials =
      await this.employeeCredentials.provisionPortalForEmployee(
        tenantId,
        row.id,
      );

    return {
      ...this.serializeEmployee(row, { revealBank: false }),
      portalCredentials,
    };
  }

  async findOne(tenantId: string, id: string, opts: { revealBank: boolean }) {
    const row = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      select: detailSelectBase,
    });
    if (!row) throw new NotFoundException('Employee not found');
    return this.serializeEmployee(row, { revealBank: opts.revealBank });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateEmployeeDto,
    userId: string | null,
  ) {
    const existing = await this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Employee not found');

    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      await this.assertDepartment(tenantId, dto.departmentId);
    }
    if (dto.designationId !== undefined && dto.designationId !== null) {
      await this.assertDesignation(tenantId, dto.designationId);
    }

    if (dto.email !== undefined) {
      const emailNorm = dto.email.toLowerCase().trim();
      const clash = await this.prisma.employee.findFirst({
        where: {
          tenantId,
          email: emailNorm,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (clash)
        throw new ConflictException(
          'An employee with this email already exists',
        );
    }

    if (dto.employeeCode !== undefined) {
      const code = dto.employeeCode.trim().toUpperCase();
      const clash = await this.prisma.employee.findFirst({
        where: {
          tenantId,
          employeeCode: code,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (clash) throw new ConflictException('Employee code already in use');
    }

    const before = {
      employeeCode: existing.employeeCode,
      firstName: existing.firstName,
      lastName: existing.lastName,
      email: existing.email,
      dateOfJoining: existing.dateOfJoining.toISOString().slice(0, 10),
      departmentId: existing.departmentId,
      designationId: existing.designationId,
      status: existing.status,
      ctcAnnual: existing.ctcAnnual?.toString() ?? null,
      pan: existing.pan,
    };

    const data: Prisma.EmployeeUncheckedUpdateInput = {};
    if (dto.employeeCode !== undefined) {
      data.employeeCode = dto.employeeCode.trim().toUpperCase();
    }
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.email !== undefined) data.email = dto.email.toLowerCase().trim();
    if (dto.dateOfJoining !== undefined) {
      data.dateOfJoining = parseISODateOnly(dto.dateOfJoining);
    }
    if (dto.departmentId !== undefined) {
      data.departmentId = dto.departmentId;
    }
    if (dto.designationId !== undefined) {
      data.designationId = dto.designationId;
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.ctcAnnual !== undefined) {
      data.ctcAnnual =
        dto.ctcAnnual === null ? null : new Prisma.Decimal(dto.ctcAnnual);
    }
    if (dto.pan !== undefined) {
      data.pan = dto.pan === null ? null : dto.pan.toUpperCase().trim();
    }

    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
      select: detailSelectBase,
    });

    const after = {
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      dateOfJoining: row.dateOfJoining.toISOString().slice(0, 10),
      departmentId: row.departmentId,
      designationId: row.designationId,
      status: row.status,
      ctcAnnual: row.ctcAnnual?.toString() ?? null,
      pan: row.pan,
    };

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? undefined,
        action: 'employee.update',
        entityType: 'Employee',
        entityId: id,
        diff: toJsonValue({ before, after }),
      },
    });

    return this.serializeEmployee(row, { revealBank: false });
  }

  async updateBankDetails(
    tenantId: string,
    id: string,
    dto: UpdateBankDetailsDto,
    userId: string | null,
  ) {
    if (
      dto.bankName === undefined &&
      dto.bankAccount === undefined &&
      dto.ifsc === undefined &&
      dto.salaryPaymentMethod === undefined
    ) {
      throw new BadRequestException(
        'Provide bankName, bankAccount, ifsc, and/or salaryPaymentMethod',
      );
    }

    const existing = await this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Employee not found');

    const ex = existing as typeof existing & {
      bankName: string | null;
      salaryPaymentMethod: string;
    };

    const before = {
      bankName: ex.bankName,
      bankAccount: ex.bankAccount ? '***' : null,
      ifsc: ex.ifsc,
      salaryPaymentMethod: ex.salaryPaymentMethod,
    };

    const patch: Prisma.EmployeeUncheckedUpdateInput = {};
    if (dto.bankName !== undefined) {
      patch.bankName = dto.bankName === null ? null : dto.bankName.trim();
    }
    if (dto.bankAccount !== undefined) {
      patch.bankAccount =
        dto.bankAccount === null ? null : dto.bankAccount.trim();
    }
    if (dto.ifsc !== undefined) {
      patch.ifsc = dto.ifsc === null ? null : dto.ifsc.toUpperCase().trim();
    }
    if (dto.salaryPaymentMethod !== undefined) {
      patch.salaryPaymentMethod = dto.salaryPaymentMethod;
    }

    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(patch as Prisma.EmployeeUncheckedUpdateInput),
        version: { increment: 1 },
      },
      select: detailSelectBase,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? undefined,
        action: 'employee.bank_details.update',
        entityType: 'Employee',
        entityId: id,
        diff: toJsonValue({
          before,
          after: {
            bankName: row.bankName,
            bankAccount: row.bankAccount ? '***' : null,
            ifsc: row.ifsc,
            salaryPaymentMethod: row.salaryPaymentMethod,
          },
        }),
      },
    });

    return this.serializeEmployee(row, { revealBank: true });
  }

  async remove(tenantId: string, id: string, userId: string | null) {
    const existing = await this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Employee not found');

    await this.prisma.employee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: EmploymentStatus.INACTIVE,
        version: { increment: 1 },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? undefined,
        action: 'employee.soft_delete',
        entityType: 'Employee',
        entityId: id,
        diff: toJsonValue({
          before: { deletedAt: null, status: existing.status },
          after: { deletedAt: new Date().toISOString(), status: 'INACTIVE' },
        }),
      },
    });

    return { id, deleted: true };
  }

  private serializeEmployee(
    row: {
      id: string;
      tenantId: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      email: string;
      status: EmploymentStatus;
      departmentId: string | null;
      designationId: string | null;
      dateOfJoining: Date;
      ctcAnnual: Prisma.Decimal | null;
      pan: string | null;
      bankName: string | null;
      bankAccount: string | null;
      ifsc: string | null;
      salaryPaymentMethod: string;
      version: number;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      department: { id: string; name: string; code: string } | null;
      designation: { id: string; title: string } | null;
    },
    opts: { revealBank: boolean },
  ) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      status: row.status,
      departmentId: row.departmentId,
      designationId: row.designationId,
      departmentName: row.department?.name ?? null,
      designationTitle: row.designation?.title ?? null,
      dateOfJoining: row.dateOfJoining.toISOString().slice(0, 10),
      ctcAnnual:
        row.ctcAnnual === null ? null : Number(row.ctcAnnual.toString()),
      pan: maskPan(row.pan),
      bankName: row.bankName,
      bankAccount: opts.revealBank
        ? row.bankAccount
        : maskBank(row.bankAccount),
      ifsc:
        opts.revealBank && row.ifsc
          ? row.ifsc
          : row.ifsc
            ? `****${row.ifsc.slice(-4)}`
            : null,
      salaryPaymentMethod: row.salaryPaymentMethod,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      deactivatedAt: row.deletedAt?.toISOString() ?? null,
    };
  }

  private async generateUniqueEmployeeCode(tenantId: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = `EMP-${String(randomInt(1, 999_999)).padStart(6, '0')}`;
      const exists = await this.prisma.employee.findFirst({
        where: { tenantId, employeeCode: code },
      });
      if (!exists) return code;
    }
    throw new ConflictException('Could not allocate a unique employee code');
  }

  private async assertDepartment(tenantId: string, departmentId: string) {
    const d = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId, deletedAt: null },
    });
    if (!d) {
      throw new BadRequestException('Invalid departmentId for this workspace');
    }
  }

  private async assertDesignation(tenantId: string, designationId: string) {
    const d = await this.prisma.designation.findFirst({
      where: { id: designationId, tenantId, deletedAt: null },
    });
    if (!d) {
      throw new BadRequestException('Invalid designationId for this workspace');
    }
  }

  private async resolveDepartmentIdByCode(
    tenantId: string,
    code: string,
  ): Promise<string | null> {
    const d = await this.prisma.department.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        code: { equals: code, mode: 'insensitive' },
      },
      select: { id: true },
    });
    return d?.id ?? null;
  }

  private async resolveDesignationIdByTitle(
    tenantId: string,
    title: string,
  ): Promise<string | null> {
    const d = await this.prisma.designation.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        title: { equals: title, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return d?.id ?? null;
  }
}
