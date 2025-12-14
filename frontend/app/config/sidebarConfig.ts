// Role-based Sidebar Navigation Configuration
import { SystemRole } from '@/app/types';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  children?: NavItem[];
}

export interface SidebarConfig {
  role: SystemRole;
  title: string;
  navItems: NavItem[];
}

// =====================================================
// DEPARTMENT EMPLOYEE - Self-service access
// =====================================================
const DEPARTMENT_EMPLOYEE_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard/department-employee',
    icon: 'home',
  },
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
  {
    label: 'My Onboarding',
    href: '/portal/my-onboarding',
    icon: 'clipboard-check',
  },
  {
    label: 'Organization',
    href: '/dashboard/department-employee/organization',
    icon: 'building',
  },
  {
    label: 'My Performance',
    href: '/dashboard/department-employee/performance',
    icon: 'trending-up',
  },
  {
    label: 'My Leaves',
    href: '/dashboard/department-employee/leaves',
    icon: 'calendar',
  },
  {
    label: 'Time & Attendance',
    href: '/dashboard/department-employee/time-management',
    icon: 'clock',
  },
  {
    label: 'My Payslips',
    href: '/dashboard/department-employee/payroll',
    icon: 'dollar-sign',
  },
  {
    label: 'Resignation',
    href: '/portal/my-resignation',
    icon: 'log-out',
  },
];

// =====================================================
// DEPARTMENT HEAD - Team management
// =====================================================
const DEPARTMENT_HEAD_NAV: NavItem[] = [
  {
    label: 'Dashboard',
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
    icon: 'trending-up',
  },
  {
    label: 'Leave Approvals',
    href: '/dashboard/department-head/leaves',
    icon: 'calendar',
  },
  {
    label: 'Time Approvals',
    href: '/dashboard/department-head/time-management',
    icon: 'clock',
  },
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
  {
    label: 'Resignation',
    href: '/portal/my-resignation',
    icon: 'log-out',
  },
];

// =====================================================
// HR MANAGER - Full HR access
// =====================================================
const HR_MANAGER_NAV: NavItem[] = [
  {
    label: 'Dashboard',
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
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
];

// =====================================================
// HR EMPLOYEE - HR operations
// =====================================================
const HR_EMPLOYEE_NAV: NavItem[] = [
  {
    label: 'Dashboard',
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
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
];

// =====================================================
// HR ADMIN - Full administrative access
// =====================================================
const HR_ADMIN_NAV: NavItem[] = [
  {
    label: 'Dashboard',
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
];

// =====================================================
// SYSTEM ADMIN - System-wide configuration
// =====================================================
const SYSTEM_ADMIN_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard/system-admin',
    icon: 'home',
  },
  {
    label: 'Access Management',
    href: '/portal/access-management',
    icon: 'shield',
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
];

// =====================================================
// PAYROLL SPECIALIST - Payroll operations
// =====================================================
const PAYROLL_SPECIALIST_NAV: NavItem[] = [
  {
    label: 'Dashboard',
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
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
];

// =====================================================
// PAYROLL MANAGER - Payroll management
// =====================================================
const PAYROLL_MANAGER_NAV: NavItem[] = [
  {
    label: 'Dashboard',
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
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
];

// =====================================================
// RECRUITER - Recruitment operations
// =====================================================
const RECRUITER_NAV: NavItem[] = [
  {
    label: 'Dashboard',
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
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
];

// =====================================================
// FINANCE STAFF - Financial operations
// =====================================================
const FINANCE_STAFF_NAV: NavItem[] = [
  {
    label: 'Dashboard',
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
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
];

// =====================================================
// JOB CANDIDATE - Limited access
// =====================================================
const JOB_CANDIDATE_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard/job-candidate',
    icon: 'home',
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
];

// =====================================================
// LEGAL & POLICY ADMIN
// =====================================================
const LEGAL_POLICY_ADMIN_NAV: NavItem[] = [
  {
    label: 'Dashboard',
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
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
];

// =====================================================
// SIDEBAR CONFIG MAPPING
// =====================================================
export const SIDEBAR_CONFIG: Record<SystemRole, SidebarConfig> = {
  [SystemRole.DEPARTMENT_EMPLOYEE]: {
    role: SystemRole.DEPARTMENT_EMPLOYEE,
    title: 'Employee Portal',
    navItems: DEPARTMENT_EMPLOYEE_NAV,
  },
  [SystemRole.DEPARTMENT_HEAD]: {
    role: SystemRole.DEPARTMENT_HEAD,
    title: 'Team Management',
    navItems: DEPARTMENT_HEAD_NAV,
  },
  [SystemRole.HR_MANAGER]: {
    role: SystemRole.HR_MANAGER,
    title: 'HR Management',
    navItems: HR_MANAGER_NAV,
  },
  [SystemRole.HR_EMPLOYEE]: {
    role: SystemRole.HR_EMPLOYEE,
    title: 'HR Operations',
    navItems: HR_EMPLOYEE_NAV,
  },
  [SystemRole.HR_ADMIN]: {
    role: SystemRole.HR_ADMIN,
    title: 'HR Administration',
    navItems: HR_ADMIN_NAV,
  },
  [SystemRole.SYSTEM_ADMIN]: {
    role: SystemRole.SYSTEM_ADMIN,
    title: 'System Administration',
    navItems: SYSTEM_ADMIN_NAV,
  },
  [SystemRole.PAYROLL_SPECIALIST]: {
    role: SystemRole.PAYROLL_SPECIALIST,
    title: 'Payroll Operations',
    navItems: PAYROLL_SPECIALIST_NAV,
  },
  [SystemRole.PAYROLL_MANAGER]: {
    role: SystemRole.PAYROLL_MANAGER,
    title: 'Payroll Management',
    navItems: PAYROLL_MANAGER_NAV,
  },
  [SystemRole.RECRUITER]: {
    role: SystemRole.RECRUITER,
    title: 'Recruitment',
    navItems: RECRUITER_NAV,
  },
  [SystemRole.FINANCE_STAFF]: {
    role: SystemRole.FINANCE_STAFF,
    title: 'Finance',
    navItems: FINANCE_STAFF_NAV,
  },
  [SystemRole.JOB_CANDIDATE]: {
    role: SystemRole.JOB_CANDIDATE,
    title: 'Candidate Portal',
    navItems: JOB_CANDIDATE_NAV,
  },
  [SystemRole.LEGAL_POLICY_ADMIN]: {
    role: SystemRole.LEGAL_POLICY_ADMIN,
    title: 'Legal & Policy',
    navItems: LEGAL_POLICY_ADMIN_NAV,
  },
};

// Helper function to get sidebar config for a role
export function getSidebarConfig(role: SystemRole): SidebarConfig {
  return SIDEBAR_CONFIG[role] || SIDEBAR_CONFIG[SystemRole.DEPARTMENT_EMPLOYEE];
}

// Helper function to get default dashboard route for a role
export function getDefaultDashboardRoute(role: SystemRole): string {
  const config = getSidebarConfig(role);
  return config.navItems[0]?.href || '/dashboard';
}

