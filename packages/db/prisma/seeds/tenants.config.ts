/** Demo tenant profiles — slug is login workspace identifier. */
export type TenantProfile = {
  slug: string;
  name: string;
  legalName: string;
  industry: string;
  employeeCount: number;
  settings: Record<string, unknown>;
};

export const DEMO_PASSWORD = 'Demo@12345';

export const TENANT_PROFILES: TenantProfile[] = [
  {
    slug: 'vetan-tech',
    name: 'Vetan Technologies Pvt Ltd',
    legalName: 'Vetan Technologies Private Limited',
    industry: 'Information Technology',
    employeeCount: 52,
    settings: {
      companyProfile: {
        officialEmail: 'hr@vetan-tech.demo',
        companyType: 'Private Limited',
        gst: '27AABCV1234F1Z5',
        companyPan: 'AABCV1234F',
      },
      payrollConfiguration: {
        salaryCycle: 'Monthly',
        payDate: 'Last working day',
        currency: 'INR',
        payrollFrequency: 'Monthly',
        payrollStartMonth: 'April',
        variablePayEnabled: true,
        overtimeEnabled: true,
      },
    },
  },
  {
    slug: 'nova-startup',
    name: 'Nova Labs India',
    legalName: 'Nova Labs India LLP',
    industry: 'Startup',
    employeeCount: 28,
    settings: {
      payrollConfiguration: { salaryCycle: 'Monthly', currency: 'INR' },
    },
  },
  {
    slug: 'bharat-manufacturing',
    name: 'Bharat Precision Manufacturing',
    legalName: 'Bharat Precision Manufacturing Ltd',
    industry: 'Manufacturing',
    employeeCount: 120,
    settings: {
      payrollConfiguration: {
        overtimeEnabled: true,
        salaryCycle: 'Monthly',
      },
    },
  },
  {
    slug: 'metro-retail',
    name: 'Metro Retail Collective',
    legalName: 'Metro Retail Collective Pvt Ltd',
    industry: 'Retail',
    employeeCount: 85,
    settings: {},
  },
  {
    slug: 'city-care-hospital',
    name: 'City Care Hospital',
    legalName: 'City Care Healthcare Pvt Ltd',
    industry: 'Healthcare',
    employeeCount: 95,
    settings: {},
  },
  {
    slug: 'greenfield-college',
    name: 'Greenfield College',
    legalName: 'Greenfield Educational Trust',
    industry: 'Education',
    employeeCount: 45,
    settings: {},
  },
  {
    slug: 'swift-logistics',
    name: 'Swift Logistics India',
    legalName: 'Swift Logistics India Pvt Ltd',
    industry: 'Logistics',
    employeeCount: 65,
    settings: {},
  },
];
