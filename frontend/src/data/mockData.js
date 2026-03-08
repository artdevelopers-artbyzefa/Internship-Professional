// ── Mock Data ────────────────────────────────────────────────
export const mockStudents = [
  { id: 1, name: 'Ali Hassan', reg: '2021-CUI-ATD-001', email: 'ali@cuiatd.edu.pk', company: 'TechSoft Pvt Ltd', supervisor: 'Dr. Kamran Ahmed', status: 'Approved', grade: 82 },
  { id: 2, name: 'Sara Malik', reg: '2021-CUI-ATD-002', email: 'sara@cuiatd.edu.pk', company: 'NetSol Technologies', supervisor: 'Dr. Amna Shah', status: 'Pending', grade: null },
  { id: 3, name: 'Usman Riaz', reg: '2021-CUI-ATD-003', email: 'usman@cuiatd.edu.pk', company: 'Systems Limited', supervisor: 'Dr. Kamran Ahmed', status: 'Approved', grade: 91 },
  { id: 4, name: 'Fatima Noor', reg: '2021-CUI-ATD-004', email: 'fatima@cuiatd.edu.pk', company: '10Pearls', supervisor: 'Dr. Amna Shah', status: 'Rejected', grade: null },
  { id: 5, name: 'Bilal Khan', reg: '2021-CUI-ATD-005', email: 'bilal@cuiatd.edu.pk', company: 'Arbisoft', supervisor: 'Dr. Kamran Ahmed', status: 'Approved', grade: 76 },
];

export const mockCompanies = [
  { id: 1, name: 'TechSoft Pvt Ltd', sector: 'Software', city: 'Islamabad', contact: 'info@techsoft.com', supervisors: ['Mr. Tariq Mehmood', 'Ms. Nadia Ali'] },
  { id: 2, name: 'NetSol Technologies', sector: 'IT Services', city: 'Lahore', contact: 'hr@netsol.com', supervisors: ['Mr. Adnan Butt'] },
  { id: 3, name: 'Systems Limited', sector: 'Enterprise Software', city: 'Karachi', contact: 'careers@systemsltd.com', supervisors: ['Ms. Hina Rao', 'Mr. Zain Abbas'] },
  { id: 4, name: '10Pearls', sector: 'Product Development', city: 'Islamabad', contact: 'talent@10pearls.com', supervisors: ['Mr. Omar Sheikh'] },
];

export const mockReports = [
  { id: 1, student: 'Ali Hassan', type: 'Weekly Report 1', submitted: '2025-01-15', status: 'Submitted', marks: 18 },
  { id: 2, student: 'Sara Malik', type: 'Weekly Report 1', submitted: null, status: 'Pending', marks: null },
  { id: 3, student: 'Usman Riaz', type: 'Weekly Report 1', submitted: '2025-01-14', status: 'Submitted', marks: 20 },
  { id: 4, student: 'Ali Hassan', type: 'Weekly Report 2', submitted: '2025-01-22', status: 'Submitted', marks: 17 },
  { id: 5, student: 'Usman Riaz', type: 'Weekly Report 2', submitted: '2025-01-21', status: 'Submitted', marks: 19 },
];

export const mockRequests = [
  { id: 1, student: 'Sara Malik', reg: '2021-CUI-ATD-002', company: 'NetSol Technologies', startDate: '2025-02-01', duration: '8 weeks', status: 'Pending' },
  { id: 2, student: 'Bilal Khan', reg: '2021-CUI-ATD-005', company: 'Arbisoft', startDate: '2025-02-01', duration: '8 weeks', status: 'Approved' },
  { id: 3, student: 'Fatima Noor', reg: '2021-CUI-ATD-004', company: '10Pearls', startDate: '2025-01-20', duration: '8 weeks', status: 'Rejected' },
];

export const mockEvaluations = [
  { id: 1, student: 'Ali Hassan', reg: '2021-CUI-ATD-001', technical: 42, professional: 28, reports: 38, total: 108, maxTotal: 130, status: 'Pending HOD' },
  { id: 2, student: 'Usman Riaz', reg: '2021-CUI-ATD-003', technical: 45, professional: 30, reports: 40, total: 115, maxTotal: 130, status: 'Locked' },
  { id: 3, student: 'Bilal Khan', reg: '2021-CUI-ATD-005', technical: 38, professional: 25, reports: 32, total: 95, maxTotal: 130, status: 'Draft' },
];

export const facultyList = ['Dr. Kamran Ahmed', 'Dr. Amna Shah', 'Dr. Farhan Zafar'];
