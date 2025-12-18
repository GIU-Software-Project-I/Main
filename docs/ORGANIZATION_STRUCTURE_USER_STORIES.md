# Organization Structure Module - User Story Navigation Guide

This document maps each user story requirement to its corresponding frontend page for the Organization Structure module.

## Requirements Overview

| Requirement ID | Description | Business Rules |
|----------------|-------------|----------------|
| REQ-OSM-01 | Define and create departments and positions | BR 5, BR 10 |
| REQ-OSM-02 | Update existing departments and positions | BR 22 |
| REQ-OSM-03 | Submit requests for changes to team assignments | BR 22 |
| REQ-OSM-04 | Review and approve manager requests for changes | BR 22 |
| REQ-OSM-05 | Deactivate or remove obsolete roles or positions | BR 5 |
| REQ-OSM-11 | Notify managers and relevant stakeholders when structural change occurs | BR 22 |
| REQ-SANV-01 | View organizational hierarchy | BR 24, BR 41 |
| REQ-SANV-02 | View team structure and reporting lines | BR 41 |

---

## User Story to Page Mapping

### System Admin Role

| User Story | Description | Page Route | Backend Endpoint |
|------------|-------------|------------|------------------|
| REQ-OSM-01 | Create departments | `/dashboard/system-admin/organization-structure/departments/new` | `POST /organization-structure/departments` |
| REQ-OSM-01 | Create positions | `/dashboard/system-admin/organization-structure/positions/new` | `POST /organization-structure/positions` |
| REQ-OSM-02 | Update departments | `/dashboard/system-admin/organization-structure/departments/[id]` | `PATCH /organization-structure/departments/:id` |
| REQ-OSM-02 | Update positions | `/dashboard/system-admin/organization-structure/positions/[id]` | `PATCH /organization-structure/positions/:id` |
| REQ-OSM-04 | Review change requests | `/dashboard/system-admin/organization-structure/change-requests` | `GET/POST /organization-structure/change-requests/:id/approvals` |
| REQ-OSM-05 | Deactivate departments | `/dashboard/system-admin/organization-structure` | `PATCH /organization-structure/departments/:id/deactivate` |
| REQ-OSM-05 | Deactivate positions | `/dashboard/system-admin/organization-structure` | `PATCH /organization-structure/positions/:id/deactivate` |
| REQ-SANV-01 | View organization chart | `/dashboard/system-admin/organization-structure/org-chart` | `GET /organization-structure/org-chart` |

### Department Head / Manager Role

| User Story | Description | Page Route | Backend Endpoint |
|------------|-------------|------------|------------------|
| REQ-OSM-03 | Submit change requests | `/dashboard/department-head/team-structure` | `POST /organization-structure/change-requests` |
| REQ-SANV-02 | View team structure | `/dashboard/department-head/team-structure` | `GET /organization-structure/assignments` |

### Employee Role (Self-Service Portal)

| User Story | Description | Page Route | Backend Endpoint |
|------------|-------------|------------|------------------|
| REQ-SANV-01 | View organization chart | `/portal/my-organization` | `GET /organization-structure/org-chart` |

---

## Navigation Flow

### System Admin Flow

```
System Admin Dashboard
    └── Organization
        ├── Overview (Main page with departments/positions tables)
        │   ├── Create Department → /organization-structure/departments/new
        │   ├── Edit Department → /organization-structure/departments/[id]
        │   ├── Create Position → /organization-structure/positions/new
        │   ├── Edit Position → /organization-structure/positions/[id]
        │   ├── Deactivate/Reactivate (inline actions)
        ├── Org Chart → /organization-structure/org-chart
        └── Change Requests → /organization-structure/change-requests
            └── Review/Approve/Reject requests
```

### Department Head Flow

```
Department Head Dashboard
    └── Team Management
        └── Team Structure
            ├── View team members and positions
            ├── Submit change requests (modal)
            └── Track submitted requests
```

### Employee Flow

```
Self-Service Portal
    └── Organization
        └── View organizational hierarchy with search
            └── Find your position (highlighted)
```

---

## Business Rules Compliance

### BR 5: Unique Codes
- Department codes and position codes must be unique
- Enforced in create/update forms

### BR 10: Position Requirements
- Position must have: Title, Code, Department ID
- Pay Grade is recommended for payroll linkage

### BR 22: Version History & Audit Logs
- All changes are logged through change requests
- Approval/rejection workflow maintains audit trail

### BR 24: Graphical Chart
- Organization structure viewable as expandable tree
- Color-coded nodes (departments, filled positions, vacant positions)

### BR 30: Cost Center & Payroll Linkage
- Departments can have cost centers assigned
- Positions have pay grade and salary range fields

### BR 41: Role-Based Access
- Employees see full org chart (read-only)
- Managers see their direct team for change requests
- System Admin has full create/edit/deactivate access

---

## API Endpoints Summary

### Departments
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/organization-structure/departments` | Create department | System Admin, HR Admin |
| GET | `/organization-structure/departments` | List departments | All authenticated |
| GET | `/organization-structure/departments/:id` | Get department | All authenticated |
| PATCH | `/organization-structure/departments/:id` | Update department | System Admin, HR Admin |
| PATCH | `/organization-structure/departments/:id/deactivate` | Deactivate | System Admin, HR Admin |
| PATCH | `/organization-structure/departments/:id/reactivate` | Reactivate | System Admin, HR Admin |
| GET | `/organization-structure/departments/stats` | Get statistics | HR roles |

### Positions
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/organization-structure/positions` | Create position | System Admin, HR Admin |
| GET | `/organization-structure/positions` | List positions | All authenticated |
| GET | `/organization-structure/positions/:id` | Get position | All authenticated |
| PATCH | `/organization-structure/positions/:id` | Update position | System Admin, HR Admin |
| PATCH | `/organization-structure/positions/:id/deactivate` | Deactivate | System Admin, HR Admin |
| PATCH | `/organization-structure/positions/:id/reactivate` | Reactivate | System Admin, HR Admin |
| GET | `/organization-structure/positions/stats` | Get statistics | HR roles |

### Assignments
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/organization-structure/assignments` | Assign employee | System Admin, HR Admin |
| GET | `/organization-structure/assignments` | Search assignments | HR roles, Dept Head |
| GET | `/organization-structure/assignments/:id` | Get assignment | HR roles, Dept Head |
| PATCH | `/organization-structure/assignments/:id/end` | End assignment | System Admin, HR Admin |

### Change Requests
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/organization-structure/change-requests` | Create request | Dept Head, HR roles |
| GET | `/organization-structure/change-requests` | List requests | HR roles |
| GET | `/organization-structure/change-requests/:id` | Get request | HR roles |
| PATCH | `/organization-structure/change-requests/:id/cancel` | Cancel request | Requester |
| POST | `/organization-structure/change-requests/:id/approvals` | Submit decision | System Admin, HR Admin |

### Organization Chart
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/organization-structure/org-chart` | Get full hierarchy | All authenticated |

---

## Testing Checklist

### System Admin
- [ ] Navigate to Organization Structure from sidebar
- [ ] Create a new department with all fields
- [ ] Create a new position linked to department
- [ ] Edit an existing department
- [ ] Edit an existing position
- [ ] Deactivate a department (check confirmation)
- [ ] Reactivate a department
- [ ] Deactivate a position
- [ ] View organization chart with expand/collapse
- [ ] Search in organization chart
- [ ] View pending change requests
- [ ] Approve a change request
- [ ] Reject a change request with reason

### Department Head
- [ ] Navigate to Team Structure from sidebar
- [ ] View team members and their positions
- [ ] Submit a change request (team reassignment)
- [ ] Track submitted request status

### Employee
- [ ] Navigate to Organization from portal sidebar
- [ ] View organization hierarchy
- [ ] Search for departments/positions
- [ ] Verify own position is highlighted
- [ ] Expand/collapse nodes

---

## File Structure

```
app/
├── dashboard/
│   ├── system-admin/
│   │   └── organization-structure/
│   │       ├── page.tsx                    # Main overview (departments/positions)
│   │       ├── org-chart/
│   │       │   └── page.tsx               # Organization chart visualization
│   │       ├── change-requests/
│   │       │   └── page.tsx               # Change requests management
│   │       ├── departments/
│   │       │   └── [id]/
│   │       │       └── page.tsx           # Create/Edit department form
│   │       └── positions/
│   │           └── [id]/
│   │               └── page.tsx           # Create/Edit position form
│   └── department-head/
│       └── team-structure/
│           └── page.tsx                    # Team view + change request submission
├── portal/
│   └── my-organization/
│       └── page.tsx                        # Employee org chart view
└── services/
    └── organization-structure/
        └── index.ts                        # API service functions
```

