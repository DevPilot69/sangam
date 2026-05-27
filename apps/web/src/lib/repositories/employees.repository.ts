import {
  bulkImportEmployees,
  createEmployee,
  fetchEmployee,
  fetchEmployees,
  fetchEmployeesExport,
  updateEmployee,
  type ApiEmployeeDetail,
  type ApiPaginatedEmployees,
  type BulkImportEmployeesResult,
  type EmployeeListParams,
} from "@/lib/api/employees";
import { apiEmployeesToRows } from "@/lib/mappers/employee.mapper";
import type { EmployeeRow } from "@/types";

export const employeesRepository = {
  list: (token: string, params?: EmployeeListParams): Promise<ApiPaginatedEmployees> =>
    fetchEmployees(token, params),

  listRows: async (token: string, params?: EmployeeListParams): Promise<EmployeeRow[]> => {
    const data = await fetchEmployees(token, params);
    return apiEmployeesToRows(data.items);
  },

  get: (token: string, id: string) => fetchEmployee(token, id),

  create: (token: string, body: Parameters<typeof createEmployee>[1]) =>
    createEmployee(token, body),

  update: (token: string, id: string, body: Parameters<typeof updateEmployee>[2]) =>
    updateEmployee(token, id, body),

  exportAll: (token: string, params?: EmployeeListParams) =>
    fetchEmployeesExport(token, params),

  bulkImport: (token: string, rows: Parameters<typeof bulkImportEmployees>[1]) =>
    bulkImportEmployees(token, rows),
};

export type { ApiEmployeeDetail, ApiPaginatedEmployees, BulkImportEmployeesResult, EmployeeListParams };
