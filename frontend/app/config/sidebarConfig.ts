// Role-based Sidebar Navigation Configuration
import { SystemRole } from '@/app/types';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  children?: NavItem[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface SidebarConfig {
  role: SystemRole;
  title: string;
  sections: NavSection[];
}

// =====================================================
// COMMON SELF-SERVICE SECTION (for all roles)
// =====================================================
const SELF_SERVICE_SECTION: NavSection = {
  title: 'Self-Service',
  items: [
    {
      label: 'My Profile',
      href: '/portal/my-profile',
      icon: 'user',
    },
    {
      label: 'My Schedule',
      href: '/portal/my-schedule',
      icon: 'calendar',
    },
    {
      label: 'My Attendance',
      href: '/portal/my-attendance',
      icon: 'clock',
    },
    {
      label: 'My Leaves',
      href: '/portal/my-leaves',
      icon: 'briefcase',
    },
    {
      label: 'My Performance',
      href: '/portal/my-performance',
      icon: 'trending-up',
    },
    {
      label: 'My Payslips',
      href: '/portal/my-payslips',
      icon: 'dollar-sign',
    },
    {
      label: 'My Benefits',
      href: '/portal/my-benefits',
      icon: 'shield',
    },
    {
      label: 'My Expenses',
      href: '/portal/my-expenses',
      icon: 'credit-card',
    },
    {
      label: 'Organization',
      href: '/portal/my-organization',
      icon: 'building',
    },
    {
      label: 'Notifications',
      href: '/portal/my-notifications',
      icon: 'bell',
    },
    {
      label: 'My Onboarding',
      href: '/portal/my-onboarding',
      icon: 'clipboard-check',
    },
    {
      label: 'Resignation',
      href: '/portal/my-resignation',
      icon: 'log-out',
    },
  ],
};

// =====================================================
// DEPARTMENT EMPLOYEE - Self-service access
// =====================================================
const DEPARTMENT_EMPLOYEE_SECTIONS: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/department-employee',
        icon: 'home',
      },
      {
        label: 'Organization',
        href: '/dashboard/department-employee/organization',
        icon: 'building',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// DEPARTMENT HEAD - Team management
// =====================================================
const DEPARTMENT_HEAD_SECTIONS: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/department-head',
        icon: 'home',
      },
      {
        label: 'My Team',
        href: '/dashboard/department-head/team-profiles',
        icon: 'users',
      },
      {
        label: 'Team Structure',
        href: '/dashboard/department-head/organization',
        icon: 'building',
      },
      {
        label: 'Team Performance',
        href: '/dashboard/department-head/performance',
        icon: 'bar-chart',
      },
      {
        label: 'Leave Approvals',
        href: '/dashboard/department-head/leaves',
        icon: 'calendar-check',
      },
      {
        label: 'Time Approvals',
        href: '/dashboard/department-head/time-management',
        icon: 'clock',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// HR MANAGER - Full HR access
// =====================================================
const HR_MANAGER_SECTIONS: NavSection[] = [
  {
    title: 'HR Management',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/hr-manager',
        icon: 'home',
      },
      {
        label: 'Employees',
        href: '/dashboard/hr-manager/employee-management',
        icon: 'users',
      },
      {
        label: 'Organization',
        href: '/dashboard/hr-manager/organization',
        icon: 'building',
      },
      {
        label: 'Recruitment',
        href: '/dashboard/hr-manager/recruitment',
        icon: 'user-plus',
      },
      {
        label: 'Onboarding',
        href: '/dashboard/hr-manager/onboarding',
        icon: 'clipboard-check',
      },
      {
        label: 'Performance',
        href: '/dashboard/hr-manager/performance-templates',
        icon: 'trending-up',
        children: [
          { label: 'Templates', href: '/dashboard/hr-manager/performance-templates', icon: 'file' },
          { label: 'Cycles', href: '/dashboard/hr-manager/performance-cycles', icon: 'calendar' },
          { label: 'Disputes', href: '/dashboard/hr-manager/disputes', icon: 'alert-circle' },
        ],
      },
      {
        label: 'Leaves',
        href: '/dashboard/hr-manager/leaves',
        icon: 'calendar',
      },
      {
        label: 'Offboarding',
        href: '/dashboard/hr-manager/offboarding',
        icon: 'log-out',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// HR EMPLOYEE - HR operations
// =====================================================
const HR_EMPLOYEE_SECTIONS: NavSection[] = [
  {
    title: 'HR Operations',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/hr-employee',
        icon: 'home',
      },
      {
        label: 'Employee Directory',
        href: '/dashboard/hr-employee/employee-management',
        icon: 'users',
      },
      {
        label: 'Onboarding',
        href: '/dashboard/hr-manager/onboarding',
        icon: 'clipboard-check',
      },
      {
        label: 'Equipment Reservation',
        href: '/portal/equipment-reservation',
        icon: 'briefcase',
      },
      {
        label: 'Performance',
        href: '/dashboard/hr-employee/performance-assignments',
        icon: 'trending-up',
        children: [
          { label: 'Assignments', href: '/dashboard/hr-employee/performance-assignments', icon: 'file' },
          { label: 'Monitoring', href: '/dashboard/hr-employee/performance-monitoring', icon: 'eye' },
        ],
      },
      {
        label: 'Leaves',
        href: '/dashboard/hr-employee/leaves',
        icon: 'calendar',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// HR ADMIN - Full administrative access
// =====================================================
const HR_ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'HR Administration',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/hr-admin',
        icon: 'home',
      },
      {
        label: 'Employee Management',
        href: '/dashboard/hr-admin/employee-management',
        icon: 'users',
      },
      {
        label: 'Change Requests',
        href: '/dashboard/hr-admin/change-requests',
        icon: 'edit',
        badge: 'New',
      },
      {
        label: 'Role Assignment',
        href: '/dashboard/hr-admin/role-assignment',
        icon: 'shield',
      },
      {
        label: 'Organization',
        href: '/dashboard/hr-manager/organization',
        icon: 'building',
      },
      {
        label: 'Onboarding',
        href: '/dashboard/hr-manager/onboarding',
        icon: 'clipboard-check',
      },
      {
        label: 'Performance',
        href: '/dashboard/hr-manager/performance-templates',
        icon: 'trending-up',
      },
      {
        label: 'Payroll',
        href: '/dashboard/payroll-manager/overview',
        icon: 'dollar-sign',
      },
      {
        label: 'Leaves',
        href: '/dashboard/hr-manager/leaves',
        icon: 'calendar',
      },
      {
        label: 'Offboarding',
        href: '/dashboard/hr-manager/offboarding',
        icon: 'log-out',
      },
      {
        label: 'Time Management',
        href: '/dashboard/hr-admin/time-management',
        icon: 'clock',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// SYSTEM ADMIN - System-wide configuration
// =====================================================
const SYSTEM_ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'System Administration',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/system-admin',
        icon: 'home',
      },
      {
        label: 'Access Management',
        href: '/portal/access-management',
        icon: 'shield',
      },
      {
        label: 'Onboarding',
        href: '/dashboard/system-admin/onboarding',
        icon: 'clipboard-check',
      },
      {
        label: 'Offboarding',
        href: '/dashboard/system-admin/offboarding',
        icon: 'log-out',
      },
      {
        label: 'Organization',
        href: '/dashboard/system-admin/organization',
        icon: 'building',
        children: [
          { label: 'Overview', href: '/dashboard/system-admin/organization', icon: 'eye' },
          { label: 'Departments', href: '/dashboard/system-admin/departments', icon: 'folder' },
          { label: 'Positions', href: '/dashboard/system-admin/positions', icon: 'briefcase' },
        ],
      },
      {
        label: 'User Management',
        href: '/dashboard/system-admin/users',
        icon: 'users',
      },
      {
        label: 'System Config',
        href: '/dashboard/system-admin/config',
        icon: 'settings',
      },
      {
        label: 'Audit Logs',
        href: '/dashboard/system-admin/audit',
        icon: 'file-text',
      },
      {
        label: 'Integrations',
        href: '/dashboard/system-admin/integrations',
        icon: 'link',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// PAYROLL SPECIALIST - Payroll operations
// =====================================================
const PAYROLL_SPECIALIST_SECTIONS: NavSection[] = [
  {
    title: 'Payroll Operations',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/payroll-specialist',
        icon: 'home',
      },
      {
        label: 'Payroll Processing',
        href: '/dashboard/payroll-specialist/processing',
        icon: 'dollar-sign',
      },
      {
        label: 'Payroll Runs',
        href: '/dashboard/payroll-specialist/runs',
        icon: 'play-circle',
      },
      {
        label: 'Employee Payroll',
        href: '/dashboard/payroll-specialist/employees',
        icon: 'users',
      },
      {
        label: 'Reports',
        href: '/dashboard/payroll-specialist/reports',
        icon: 'file-text',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// PAYROLL MANAGER - Payroll management
// =====================================================
const PAYROLL_MANAGER_SECTIONS: NavSection[] = [
  {
    title: 'Payroll Management',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/payroll-manager',
        icon: 'home',
      },
      {
        label: 'Payroll Overview',
        href: '/dashboard/payroll-manager/overview',
        icon: 'dollar-sign',
      },
      {
        label: 'Payroll Runs',
        href: '/dashboard/payroll-manager/runs',
        icon: 'play-circle',
      },
      {
        label: 'Approvals',
        href: '/dashboard/payroll-manager/approvals',
        icon: 'check-circle',
      },
      {
        label: 'Configuration',
        href: '/dashboard/payroll-manager/config',
        icon: 'settings',
      },
      {
        label: 'Reports',
        href: '/dashboard/payroll-manager/reports',
        icon: 'file-text',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// RECRUITER - Recruitment operations
// =====================================================
const RECRUITER_SECTIONS: NavSection[] = [
  {
    title: 'Recruitment',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/recruiter',
        icon: 'home',
      },
      {
        label: 'Job Postings',
        href: '/dashboard/recruiter/jobs',
        icon: 'briefcase',
      },
      {
        label: 'Applications',
        href: '/dashboard/recruiter/applications',
        icon: 'inbox',
      },
      {
        label: 'Candidates',
        href: '/dashboard/recruiter/candidates',
        icon: 'users',
      },
      {
        label: 'Interviews',
        href: '/dashboard/recruiter/interviews',
        icon: 'calendar',
      },
      {
        label: 'Reports',
        href: '/dashboard/recruiter/reports',
        icon: 'file-text',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// FINANCE STAFF - Financial operations
// =====================================================
const FINANCE_STAFF_SECTIONS: NavSection[] = [
  {
    title: 'Finance',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/finance-staff',
        icon: 'home',
      },
      {
        label: 'Payroll Reports',
        href: '/dashboard/finance-staff/payroll-reports',
        icon: 'dollar-sign',
      },
      {
        label: 'Budget',
        href: '/dashboard/finance-staff/budget',
        icon: 'trending-up',
      },
      {
        label: 'Expenses',
        href: '/dashboard/finance-staff/expenses',
        icon: 'credit-card',
      },
      {
        label: 'Reports',
        href: '/dashboard/finance-staff/reports',
        icon: 'file-text',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// JOB CANDIDATE - Limited access (no self-service)
// =====================================================
const JOB_CANDIDATE_SECTIONS: NavSection[] = [
  {
    title: 'Candidate Portal',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/job-candidate',
        icon: 'home',
      },
      {
        label: 'Document Upload',
        href: '/portal/candidate/document-upload',
        icon: 'upload',
      },
      {
        label: 'My Onboarding',
        href: '/portal/my-onboarding',
        icon: 'clipboard-check',
      },
      {
        label: 'My Applications',
        href: '/dashboard/job-candidate/applications',
        icon: 'inbox',
      },
      {
        label: 'Job Listings',
        href: '/dashboard/job-candidate/jobs',
        icon: 'briefcase',
      },
      {
        label: 'My Profile',
        href: '/dashboard/job-candidate/profile',
        icon: 'user',
      },
    ],
  },
];

// =====================================================
// LEGAL & POLICY ADMIN
// =====================================================
const LEGAL_POLICY_ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'Legal & Policy',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/legal-policy-admin',
        icon: 'home',
      },
      {
        label: 'Policies',
        href: '/dashboard/legal-policy-admin/policies',
        icon: 'file-text',
      },
      {
        label: 'Compliance',
        href: '/dashboard/legal-policy-admin/compliance',
        icon: 'shield',
      },
      {
        label: 'Documents',
        href: '/dashboard/legal-policy-admin/documents',
        icon: 'folder',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// SIDEBAR CONFIG MAPPING
// =====================================================
export const SIDEBAR_CONFIG: Record<SystemRole, SidebarConfig> = {
  [SystemRole.DEPARTMENT_EMPLOYEE]: {
    role: SystemRole.DEPARTMENT_EMPLOYEE,
    title: 'Employee Portal',
    sections: DEPARTMENT_EMPLOYEE_SECTIONS,
  },
  [SystemRole.DEPARTMENT_HEAD]: {
    role: SystemRole.DEPARTMENT_HEAD,
    title: 'Team Management',
    sections: DEPARTMENT_HEAD_SECTIONS,
  },
  [SystemRole.HR_MANAGER]: {
    role: SystemRole.HR_MANAGER,
    title: 'HR Management',
    sections: HR_MANAGER_SECTIONS,
  },
  [SystemRole.HR_EMPLOYEE]: {
    role: SystemRole.HR_EMPLOYEE,
    title: 'HR Operations',
    sections: HR_EMPLOYEE_SECTIONS,
  },
  [SystemRole.HR_ADMIN]: {
    role: SystemRole.HR_ADMIN,
    title: 'HR Administration',
    sections: HR_ADMIN_SECTIONS,
  },
  [SystemRole.SYSTEM_ADMIN]: {
    role: SystemRole.SYSTEM_ADMIN,
    title: 'System Administration',
    sections: SYSTEM_ADMIN_SECTIONS,
  },
  [SystemRole.PAYROLL_SPECIALIST]: {
    role: SystemRole.PAYROLL_SPECIALIST,
    title: 'Payroll Operations',
    sections: PAYROLL_SPECIALIST_SECTIONS,
  },
  [SystemRole.PAYROLL_MANAGER]: {
    role: SystemRole.PAYROLL_MANAGER,
    title: 'Payroll Management',
    sections: PAYROLL_MANAGER_SECTIONS,
  },
  [SystemRole.RECRUITER]: {
    role: SystemRole.RECRUITER,
    title: 'Recruitment',
    sections: RECRUITER_SECTIONS,
  },
  [SystemRole.FINANCE_STAFF]: {
    role: SystemRole.FINANCE_STAFF,
    title: 'Finance',
    sections: FINANCE_STAFF_SECTIONS,
  },
  [SystemRole.JOB_CANDIDATE]: {
    role: SystemRole.JOB_CANDIDATE,
    title: 'Candidate Portal',
    sections: JOB_CANDIDATE_SECTIONS,
  },
  [SystemRole.LEGAL_POLICY_ADMIN]: {
    role: SystemRole.LEGAL_POLICY_ADMIN,
    title: 'Legal & Policy',
    sections: LEGAL_POLICY_ADMIN_SECTIONS,
  },
};

// Helper function to get sidebar config for a role
export function getSidebarConfig(role: SystemRole): SidebarConfig {
  return SIDEBAR_CONFIG[role] || SIDEBAR_CONFIG[SystemRole.DEPARTMENT_EMPLOYEE];
}

// Helper function to get default dashboard route for a role
export function getDefaultDashboardRoute(role: SystemRole): string {
  const config = getSidebarConfig(role);
  const firstSection = config.sections[0];
  return firstSection?.items[0]?.href || '/dashboard';
}
