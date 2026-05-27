import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayrollRunStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import type { FinalizePayrollRunDto } from './dto/finalize-payroll-run.dto';
import type { UpdatePayrollSetupDto } from './dto/update-payroll-setup.dto';
import {
  normalizeSalaryPaymentMethod,
  SALARY_PAYMENT_METHOD_LABELS,
  type SalaryPaymentMethod,
} from '../../shared/banking/salary-payment-method';
import {
  assessEmployeePayrollIssues,
  defaultExcludedIds,
  estimateDeductions,
  estimateMonthlyGross,
  estimateNet,
  hasBlockingIssues,
  requiresBankTransferForSalary,
  type PayrollEmployeeCandidate,
} from './payroll-validation.util';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function periodLabel(year: number, month: number): string {
  return `${SHORT_MONTHS[month - 1] ?? month} ${year}`;
}

type PayrollRunRow = {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  initiatedById: string | null;
  excludedEmployeeIds?: string[];
  ackWarnings?: boolean;
  ackWarningsReason?: string | null;
  disbursementPaymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
  entries: { gross: Prisma.Decimal; deductions: Prisma.Decimal; net: Prisma.Decimal }[];
};

function asPayrollRunRow<T>(run: T): T & PayrollRunRow {
  return run as T & PayrollRunRow;
}

function mapRun(run: PayrollRunRow, initiatedByName: string | null) {
  const grossPay = run.entries.reduce((s, e) => s + Number(e.gross), 0);
  const totalDeductions = run.entries.reduce((s, e) => s + Number(e.deductions), 0);
  const totalNet = run.entries.reduce((s, e) => s + Number(e.net), 0);
  return {
    id: run.id,
    periodYear: run.periodYear,
    periodMonth: run.periodMonth,
    periodLabel: periodLabel(run.periodYear, run.periodMonth),
    status: run.status,
    employeeCount: run.entries.length,
    excludedCount: run.excludedEmployeeIds?.length ?? 0,
    grossPay,
    totalDeductions,
    totalNet,
    initiatedById: run.initiatedById,
    initiatedByName,
    ackWarnings: run.ackWarnings,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadActiveCandidates(tenantId: string): Promise<PayrollEmployeeCandidate[]> {
    type Row = {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      status: string;
      pan: string | null;
      bankName: string | null;
      bankAccount: string | null;
      ifsc: string | null;
      salaryPaymentMethod: string;
      ctcAnnual: { toString(): string } | null;
      department: { name: string } | null;
      salaryAssignments: { id: string }[];
    };

    const rows = (await this.prisma.employee.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' },
      orderBy: [{ employeeCode: 'asc' }],
      include: {
        department: { select: { name: true } },
        salaryAssignments: { take: 1, select: { id: true } },
      },
    })) as Row[];

    return rows.map((r) => ({
      id: r.id,
      employeeCode: r.employeeCode,
      employeeName: `${r.firstName} ${r.lastName}`.trim(),
      departmentName: r.department?.name ?? null,
      status: r.status,
      pan: r.pan,
      bankName: r.bankName,
      bankAccount: r.bankAccount,
      ifsc: r.ifsc,
      salaryPaymentMethod: String(r.salaryPaymentMethod ?? 'NEFT'),
      ctcAnnual: r.ctcAnnual ? Number(r.ctcAnnual) : null,
      hasSalaryAssignment: r.salaryAssignments.length > 0,
    }));
  }

  private buildEmployeeSetupRows(
    candidates: PayrollEmployeeCandidate[],
    excludedIds: Set<string>,
  ) {
    return candidates.map((emp) => {
      const issues = assessEmployeePayrollIssues(emp);
      const blocking = hasBlockingIssues(issues);
      const excluded = excludedIds.has(emp.id);
      const included = !excluded;
      const canInclude = !blocking;
      const gross = estimateMonthlyGross(emp.ctcAnnual);
      const deductions = estimateDeductions(gross);
      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.employeeName,
        departmentName: emp.departmentName,
        included,
        excluded,
        canInclude,
        suggestedExclude: blocking,
        issues,
        monthlyGrossEstimate: gross,
        monthlyDeductionsEstimate: deductions,
        monthlyNetEstimate: estimateNet(gross, deductions),
        fixHref: `/employees/${emp.id}`,
        disbursement: {
          bankName: emp.bankName,
          bankAccount: emp.bankAccount,
          ifsc: emp.ifsc,
          paymentMethod: emp.salaryPaymentMethod,
          paymentMethodLabel:
            SALARY_PAYMENT_METHOD_LABELS[
              normalizeSalaryPaymentMethod(emp.salaryPaymentMethod)
            ]?.label ?? emp.salaryPaymentMethod,
          requiresBankTransfer: requiresBankTransferForSalary(
            emp.salaryPaymentMethod,
          ),
        },
      };
    });
  }

  private resolvePaymentMethod(
    employeeMethod: string | null | undefined,
    runDefault: string,
  ): SalaryPaymentMethod {
    if (employeeMethod?.trim()) {
      return normalizeSalaryPaymentMethod(employeeMethod);
    }
    return normalizeSalaryPaymentMethod(runDefault);
  }

  private includedEmployeeIds(
    candidates: PayrollEmployeeCandidate[],
    excludedIds: Set<string>,
  ): string[] {
    return candidates
      .filter((e) => !excludedIds.has(e.id))
      .map((e) => e.id);
  }

  private assertDraftRun(run: { status: PayrollRunStatus }) {
    if (run.status !== PayrollRunStatus.DRAFT) {
      throw new BadRequestException(
        `Payroll run is ${run.status}; only DRAFT runs can be edited`,
      );
    }
  }

  async listRuns(tenantId: string, limit = 24) {
    const runs = await this.prisma.payrollRun.findMany({
      where: { tenantId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      take: Math.min(limit, 100),
      include: { entries: true },
    });
    const userIds = [
      ...new Set(runs.map((r) => r.initiatedById).filter(Boolean) as string[]),
    ];
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return runs.map((r) =>
      mapRun(
        asPayrollRunRow(r),
        r.initiatedById ? nameById.get(r.initiatedById) ?? null : null,
      ),
    );
  }

  async getRun(tenantId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, tenantId },
      include: {
        entries: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    let initiatedByName: string | null = null;
    if (run.initiatedById) {
      const u = await this.prisma.user.findUnique({
        where: { id: run.initiatedById },
        select: { name: true },
      });
      initiatedByName = u?.name ?? null;
    }

    const runRow = asPayrollRunRow(run);
    const base = mapRun(runRow, initiatedByName);
    return {
      ...base,
      excludedEmployeeIds: runRow.excludedEmployeeIds ?? [],
      entries: run.entries.map((e) => ({
        id: e.id,
        employeeId: e.employeeId,
        employeeCode: e.employee.employeeCode,
        employeeName: `${e.employee.firstName} ${e.employee.lastName}`.trim(),
        departmentName: e.employee.department?.name ?? null,
        gross: Number(e.gross),
        deductions: Number(e.deductions),
        net: Number(e.net),
      })),
    };
  }

  async createRun(
    tenantId: string,
    userId: string,
    dto: CreatePayrollRunDto,
  ) {
    const existing = await this.prisma.payrollRun.findUnique({
      where: {
        tenantId_periodYear_periodMonth: {
          tenantId,
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
        },
      },
    });
    if (existing) {
      if (existing.status !== PayrollRunStatus.DRAFT) {
        throw new ConflictException(
          `Payroll run for ${periodLabel(dto.periodYear, dto.periodMonth)} already exists (${existing.status})`,
        );
      }
      return this.getSetup(tenantId, existing.id);
    }

    const candidates = await this.loadActiveCandidates(tenantId);
    const autoExcluded = defaultExcludedIds(
      candidates.map((c) => ({
        id: c.id,
        issues: assessEmployeePayrollIssues(c),
      })),
    );

    const run = await this.prisma.payrollRun.create({
      data: {
        tenantId,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
        status: PayrollRunStatus.DRAFT,
        initiatedById: userId,
        excludedEmployeeIds: autoExcluded,
      } as Prisma.PayrollRunUncheckedCreateInput,
      include: { entries: true },
    });

    return this.getSetup(tenantId, run.id);
  }

  async getSetup(tenantId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, tenantId },
      include: { entries: true },
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    const runRow = asPayrollRunRow(run);
    const candidates = await this.loadActiveCandidates(tenantId);
    const excludedSet = new Set(runRow.excludedEmployeeIds ?? []);
    const employees = this.buildEmployeeSetupRows(candidates, excludedSet);
    const included = employees.filter((e) => e.included);
    const blockingIncluded = included.filter(
      (e) => hasBlockingIssues(e.issues),
    );

    return {
      run: {
        id: run.id,
        periodYear: run.periodYear,
        periodMonth: run.periodMonth,
        periodLabel: periodLabel(run.periodYear, run.periodMonth),
        monthName: MONTHS[run.periodMonth - 1] ?? String(run.periodMonth),
        status: run.status,
        excludedEmployeeIds: runRow.excludedEmployeeIds ?? [],
        ackWarnings: runRow.ackWarnings ?? false,
        ackWarningsReason: runRow.ackWarningsReason ?? null,
        disbursementPaymentMethod: normalizeSalaryPaymentMethod(
          runRow.disbursementPaymentMethod ?? 'NEFT',
        ),
        disbursementPaymentMethodLabel:
          SALARY_PAYMENT_METHOD_LABELS[
            normalizeSalaryPaymentMethod(
              runRow.disbursementPaymentMethod ?? 'NEFT',
            )
          ].label,
      },
      employees,
      summary: {
        totalActive: employees.length,
        includedCount: included.length,
        excludedCount: employees.length - included.length,
        blockingExcluded: employees.filter(
          (e) => e.excluded && e.suggestedExclude,
        ).length,
        blockingStillIncluded: blockingIncluded.length,
        warningCount: included.reduce(
          (n, e) =>
            n +
            e.issues.filter((i) => i.severity === 'warning').length,
          0,
        ),
      },
    };
  }

  async updateSetup(
    tenantId: string,
    runId: string,
    dto: UpdatePayrollSetupDto,
  ) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, tenantId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertDraftRun(run);

    const candidates = await this.loadActiveCandidates(tenantId);
    const candidateIds = new Set(candidates.map((c) => c.id));
    const excluded = dto.excludedEmployeeIds.filter((id) => candidateIds.has(id));

    const excludedSet = new Set(excluded);
    const blockingIncluded = candidates
      .filter((c) => !excludedSet.has(c.id))
      .filter((c) => hasBlockingIssues(assessEmployeePayrollIssues(c)));

    if (blockingIncluded.length > 0) {
      throw new BadRequestException({
        message:
          'Included employees must pass validation. Exclude or fix employees with blocking issues (e.g. missing IFSC).',
        blockingEmployeeIds: blockingIncluded.map((e) => e.id),
      });
    }

    await this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        excludedEmployeeIds: excluded,
        ...(dto.ackWarnings !== undefined && { ackWarnings: dto.ackWarnings }),
        ...(dto.ackWarningsReason !== undefined && {
          ackWarningsReason: dto.ackWarningsReason,
        }),
        ...(dto.disbursementPaymentMethod !== undefined && {
          disbursementPaymentMethod: dto.disbursementPaymentMethod,
        }),
      } as Prisma.PayrollRunUncheckedUpdateInput,
    });

    return this.getSetup(tenantId, runId);
  }

  async validateRun(tenantId: string, runId: string) {
    const setup = await this.getSetup(tenantId, runId);
    const included = setup.employees.filter((e) => e.included);
    const blockingIncluded = included.filter((e) =>
      hasBlockingIssues(e.issues),
    );
    const warningEmployees = included.filter((e) =>
      e.issues.some((i) => i.severity === 'warning'),
    );

    const missingIfsc = included.filter((e) =>
      e.issues.some((i) => i.code === 'MISSING_IFSC'),
    );
    const missingBank = included.filter((e) =>
      e.issues.some((i) => i.code === 'MISSING_BANK_ACCOUNT'),
    );
    const missingSalary = included.filter((e) =>
      e.issues.some((i) => i.code === 'MISSING_SALARY'),
    );

    const checks = [
      {
        id: 'included_count',
        label: 'Employees in payroll',
        status:
          included.length > 0 ? ('pass' as const) : ('fail' as const),
        message:
          included.length > 0
            ? `${included.length} employee(s) included`
            : 'At least one employee must be included',
      },
      {
        id: 'bank_name',
        label: 'Bank name on file',
        status:
          included.filter((e) =>
            e.issues.some((i) => i.code === 'MISSING_BANK_NAME'),
          ).length > 0
            ? ('fail' as const)
            : ('pass' as const),
        message:
          included.filter((e) =>
            e.issues.some((i) => i.code === 'MISSING_BANK_NAME'),
          ).length > 0
            ? `${included.filter((e) => e.issues.some((i) => i.code === 'MISSING_BANK_NAME')).length} included without bank name`
            : 'Bank names recorded for bank-transfer employees',
      },
      {
        id: 'bank_ifsc',
        label: 'Bank IFSC for disbursement',
        status:
          missingIfsc.length > 0
            ? ('fail' as const)
            : ('pass' as const),
        message:
          missingIfsc.length > 0
            ? `${missingIfsc.length} included employee(s) missing valid IFSC — exclude them to continue`
            : 'All included employees have valid IFSC',
        affectedCount: missingIfsc.length,
      },
      {
        id: 'bank_account',
        label: 'Bank account numbers',
        status:
          missingBank.length > 0 ? ('fail' as const) : ('pass' as const),
        message:
          missingBank.length > 0
            ? `${missingBank.length} included employee(s) missing bank account`
            : 'Bank accounts present for included employees',
        affectedCount: missingBank.length,
      },
      {
        id: 'salary_assigned',
        label: 'Salary / CTC assigned',
        status:
          missingSalary.length > 0 ? ('fail' as const) : ('pass' as const),
        message:
          missingSalary.length > 0
            ? `${missingSalary.length} included employee(s) without salary data`
            : 'Salary data present for included employees',
        affectedCount: missingSalary.length,
      },
      {
        id: 'pan_warning',
        label: 'PAN on file (TDS)',
        status:
          warningEmployees.length > 0 ? ('warn' as const) : ('pass' as const),
        message:
          warningEmployees.length > 0
            ? `${warningEmployees.length} included employee(s) missing PAN`
            : 'PAN recorded for included employees',
        affectedCount: warningEmployees.length,
      },
    ];

    const blockingCount = blockingIncluded.length;
    const warningCount = warningEmployees.length;
    const canProceed =
      included.length > 0 && blockingCount === 0;

    return {
      canProceed,
      blockingCount,
      warningCount,
      checks,
      blockingEmployees: blockingIncluded.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        employeeName: e.employeeName,
        issues: e.issues.filter((i) => i.severity === 'blocking'),
      })),
      requiresWarningAck: warningCount > 0 && canProceed,
    };
  }

  async previewRun(tenantId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, tenantId },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertDraftRun(run);

    const validation = await this.validateRun(tenantId, runId);
    if (!validation.canProceed) {
      throw new BadRequestException({
        message: 'Fix blocking validation issues before preview',
        validation,
      });
    }
    const runRow = asPayrollRunRow(run);
    if (validation.requiresWarningAck && !runRow.ackWarnings) {
      throw new BadRequestException(
        'Acknowledge warnings on the validate step before preview',
      );
    }

    const setup = await this.getSetup(tenantId, runId);
    const included = setup.employees.filter((e) => e.included);

    const runDefault = runRow.disbursementPaymentMethod ?? 'NEFT';

    const entries = included.map((e) => {
      const paymentMethod = this.resolvePaymentMethod(
        e.disbursement.paymentMethod,
        runDefault,
      );
      return {
        employeeId: e.id,
        employeeCode: e.employeeCode,
        employeeName: e.employeeName,
        departmentName: e.departmentName,
        gross: e.monthlyGrossEstimate,
        deductions: e.monthlyDeductionsEstimate,
        net: e.monthlyNetEstimate,
        bankName: e.disbursement.bankName,
        bankAccount: e.disbursement.bankAccount,
        ifsc: e.disbursement.ifsc,
        paymentMethod,
        paymentMethodLabel: SALARY_PAYMENT_METHOD_LABELS[paymentMethod].label,
        issues: e.issues,
      };
    });

    const totals = entries.reduce(
      (acc, e) => ({
        gross: acc.gross + e.gross,
        deductions: acc.deductions + e.deductions,
        net: acc.net + e.net,
      }),
      { gross: 0, deductions: 0, net: 0 },
    );

    return {
      run: setup.run,
      entries,
      totals,
      excludedCount: setup.summary.excludedCount,
      disbursement: {
        defaultPaymentMethod: normalizeSalaryPaymentMethod(runDefault),
        defaultPaymentMethodLabel:
          SALARY_PAYMENT_METHOD_LABELS[
            normalizeSalaryPaymentMethod(runDefault)
          ].label,
        bankTransferCount: entries.filter((e) =>
          requiresBankTransferForSalary(e.paymentMethod),
        ).length,
      },
    };
  }

  async finalizeRun(
    tenantId: string,
    runId: string,
    dto: FinalizePayrollRunDto,
  ) {
    if (dto.confirmText !== 'CONFIRM') {
      throw new BadRequestException('Type CONFIRM to finalize');
    }

    const preview = await this.previewRun(tenantId, runId);

    const run = await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollRunStatus.LOCKED },
    });

    await this.prisma.payrollEntry.deleteMany({ where: { payrollRunId: runId } });

    await this.prisma.payrollEntry.createMany({
      data: preview.entries.map((e) => ({
        payrollRunId: runId,
        employeeId: e.employeeId,
        gross: e.gross,
        deductions: e.deductions,
        net: e.net,
        breakdown: {
          periodYear: run.periodYear,
          periodMonth: run.periodMonth,
          estimates: true,
        },
      })),
    });

    return this.getRun(tenantId, runId);
  }

  async trend(tenantId: string) {
    const runs = await this.prisma.payrollRun.findMany({
      where: { tenantId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      take: 6,
      include: { entries: true },
    });
    return runs
      .map((r) => ({
        month: SHORT_MONTHS[r.periodMonth - 1] ?? String(r.periodMonth),
        periodYear: r.periodYear,
        periodMonth: r.periodMonth,
        amount: r.entries.reduce((s, e) => s + Number(e.gross), 0),
      }))
      .reverse();
  }
}
