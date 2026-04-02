import express from 'express';
import PdfPrinter from 'pdfmake/js/Printer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPKTTime, getPKTDate } from '../utils/time.js';
import { protect } from '../middleware/auth.js';
import ExcelJS from 'exceljs';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../models/User.js';
import Mark from '../models/Mark.js';
import Assignment from '../models/Assignment.js';
import Company from '../models/Company.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PrinterConstructor = PdfPrinter.default || PdfPrinter;

const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const printer = new PrinterConstructor(fonts);

// @route   POST api/reports/generate-pdf
// @desc    Generate a general faculty-list PDF
router.post('/generate-pdf', protect, asyncHandler(async (req, res) => {
    const {
        reportTitle = 'Student Report',
        supervisorName = 'Not Assigned',
        tableHeader = ['Reg. #', 'Name', 'Company', 'Status'],
        tableData = [],
        columnsLayout = ['auto', '*', '*', 'auto']
    } = req.body;

    const logoPath = path.join(__dirname, '../../public/cuilogo.png');
    let logoBase64 = null;
    if (fs.existsSync(logoPath)) {
        logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [35, 30, 35, 30],
        content: [
            {
                columns: [
                    logoBase64 ? { image: logoBase64, width: 60 } : { text: '', width: 60 },
                    {
                        stack: [
                            { text: 'COMSATS University Islamabad', style: 'uniName' },
                            { text: 'Abbottabad Campus', style: 'campusName' },
                            { text: reportTitle, style: 'reportTitle' },
                        ],
                        alignment: 'center',
                        margin: [-60, 0, 0, 0]
                    }
                ],
                margin: [0, 0, 0, 25]
            },
            {
                stack: [
                    {
                        columns: [
                            { text: 'Supervisor:', style: 'infoLabel', width: 75 },
                            { text: supervisorName || 'Dr. Ahmed', style: 'infoValue' }
                        ],
                        margin: [0, 0, 0, 4]
                    },
                    {
                        columns: [
                            { text: 'Subject:', style: 'infoLabel', width: 75 },
                            { text: 'Field Experience/Internship', style: 'infoValue' }
                        ],
                        margin: [0, 0, 0, 4]
                    },
                    {
                        columns: [
                            { text: 'Subject Code:', style: 'infoLabel', width: 75 },
                            { text: 'CSC395', style: 'infoValue' }
                        ]
                    }
                ],
                margin: [0, 0, 0, 22]
            },
            {
                table: {
                    headerRows: 1,
                    widths: columnsLayout,
                    body: [
                        tableHeader.map(h => ({ text: h, style: 'tableHeader' })),
                        ...tableData.map(row => row.map(cell => ({
                            text: String(cell || 'N/A'),
                            style: 'tableCell',
                            alignment: (cell && (cell.toString().includes('CIIT/') || !isNaN(cell) || cell.toString().length < 5)) ? 'center' : 'left'
                        })))
                    ]
                },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => '#000000',
                    vLineColor: () => '#000000',
                    paddingLeft: () => 5, paddingRight: () => 5,
                    paddingTop: () => 6, paddingBottom: () => 6,
                }
            },
            {
                text: `Generated from DIMS Portal on: ${getPKTDate()} at ${getPKTTime()}`,
                style: 'footer',
                margin: [0, 30, 0, 0]
            }
        ],
        styles: {
            uniName: { fontSize: 16, bold: true, color: '#000080', margin: [0, 0, 0, 2] },
            campusName: { fontSize: 15, bold: true, color: '#000080', margin: [0, 0, 0, 8] },
            reportTitle: { fontSize: 14, bold: true, color: '#000080', decoration: 'underline', margin: [0, 2, 0, 0] },
            infoLabel: { fontSize: 10, bold: true },
            infoValue: { fontSize: 10, bold: false },
            tableHeader: { fontSize: 9, bold: true, fillColor: '#f2f2f2', alignment: 'center' },
            tableCell: { fontSize: 8, margin: [0, 1, 0, 1] },
            footer: { fontSize: 8, italics: true, color: '#666666' }
        },
        defaultStyle: { font: 'Roboto' }
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    const safeFilename = reportTitle.replace(/[^\x00-\x7F]/g, '-').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}.pdf`);
    pdfDoc.pipe(res);
    pdfDoc.end();
}));

// @route   POST api/reports/hod-full-report
// @desc    Generate the full HOD Institutional Performance Dossier (PDF)
router.post('/hod-full-report', protect, asyncHandler(async (req, res) => {
    const { stats, charts, tables } = req.body;
    const logoPath = path.join(__dirname, '../../public/cuilogo.png');
    let logoBase64 = null;
    if (fs.existsSync(logoPath)) {
        logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }

    const s = (v) => (v == null ? 'N/A' : String(v));
    const statusColor = (st) => st === 'Pass' ? '#059669' : st === 'Fail' ? '#dc2626' : '#64748b';

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [30, 45, 30, 55],
        background: (currentPage, pageSize) => ({
            canvas: [
                { type: 'rect', x: 0, y: 0, w: pageSize.width, h: 6, color: '#1e3a8a' },
                { type: 'rect', x: 0, y: pageSize.height - 6, w: pageSize.width, h: 6, color: '#1e3a8a' }
            ]
        }),
        content: [
            {
                columns: [
                    logoBase64 ? { image: logoBase64, width: 75, margin: [0, 5, 0, 0] } : { text: '', width: 75 },
                    {
                        stack: [
                            { text: 'COMSATS UNIVERSITY ISLAMABAD', style: 'uniName' },
                            { text: 'ABBOTTABAD CAMPUS — DEPARTMENT OF COMPUTER SCIENCE', style: 'campusName' },
                            { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 400, y2: 2, lineWidth: 2, color: '#1e3a8a' }], margin: [0, 0, 0, 8] },
                            { text: 'DEPARTMENTAL INTERNSHIP PROGRAMME', style: 'reportTitle' },
                            { text: 'PERFORMANCE AUDIT & GOVERNANCE DOSSIER', style: 'reportTitle2' },
                            { text: `ACADEMIC CYCLE: ${new Date().getFullYear()}   |   CLASSIFICATION: RESTRICTED   |   ${getPKTDate()}`, style: 'reportSubTitle' },
                        ],
                        margin: [12, 0, 0, 0]
                    }
                ],
                margin: [0, 0, 0, 30]
            },
            { text: '01 — COHORT PARTICIPATION ANATOMY', style: 'sectionHeader', margin: [0, 0, 0, 10] },
            {
                table: {
                    widths: ['*', '*', '*', '*', '*'],
                    body: [
                        [
                            { text: 'TOTAL ENROLLED', style: 'kpiLabel' },
                            { text: 'PARTICIPATING', style: 'kpiLabel' },
                            { text: 'PHYSICAL PLACEMENT', style: 'kpiLabel' },
                            { text: 'FREELANCE PLACEMENT', style: 'kpiLabel' },
                            { text: 'INELIGIBLE / N/A', style: 'kpiLabel' }
                        ],
                        [
                            { text: s(stats.total), style: 'kpiValue' },
                            { text: s(stats.participating), style: 'kpiValue', color: '#1e3a8a' },
                            { text: s(stats.physical), style: 'kpiValue', color: '#2563eb' },
                            { text: s(stats.freelance), style: 'kpiValue', color: '#d97706' },
                            { text: s(stats.ineligible), style: 'kpiValue', color: '#dc2626' }
                        ]
                    ]
                },
                layout: {
                    hLineWidth: (i) => (i === 0 || i === 2) ? 1.5 : 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: (i) => (i === 0 || i === 2) ? '#1e3a8a' : '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    paddingTop: () => 10, paddingBottom: () => 10, paddingLeft: () => 6, paddingRight: () => 6,
                    fillColor: (i) => i === 0 ? '#eff6ff' : null
                },
                margin: [0, 0, 0, 22]
            },
            { text: '02 — ACADEMIC PERFORMANCE OVERVIEW', style: 'sectionHeader', margin: [0, 0, 0, 10] },
            {
                table: {
                    widths: ['*', '*', '*', '*'],
                    body: [
                        [
                            { text: 'SUCCESS RATE', style: 'kpiLabel' },
                            { text: 'GRADUATED', style: 'kpiLabel' },
                            { text: 'ATTRITION / FAIL', style: 'kpiLabel' },
                            { text: 'COHORT AVG SCORE', style: 'kpiLabel' }
                        ],
                        [
                            { text: `${Math.round(((stats.passed || 0) / (stats.participating || 1)) * 100)}%`, style: 'kpiValue', color: '#059669' },
                            { text: s(stats.passed), style: 'kpiValue', color: '#059669' },
                            { text: s(stats.failed), style: 'kpiValue', color: '#dc2626' },
                            { text: `${stats.avgPct || 0}%  (${s(stats.avgGrade)})`, style: 'kpiValue', color: '#6366f1' }
                        ]
                    ]
                },
                layout: {
                    hLineWidth: (i) => (i === 0 || i === 2) ? 1.5 : 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: (i) => (i === 0 || i === 2) ? '#1e3a8a' : '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    paddingTop: () => 10, paddingBottom: () => 10,
                    fillColor: (i) => i === 0 ? '#eff6ff' : null
                },
                margin: [0, 0, 0, 25]
            },
            { text: '03 — GRADE DISTRIBUTION & TREND ANALYSIS', style: 'sectionHeader', margin: [0, 0, 0, 12] },
            (charts.chartDist || charts.chartPie) ? {
                columns: [
                    charts.chartDist ? { image: charts.chartDist, width: 265, height: 148 } : { text: '' },
                    charts.chartPie ? { image: charts.chartPie, width: 210, height: 148, margin: [10, 0, 0, 0] } : { text: '' }
                ],
                margin: [0, 0, 0, 15]
            } : {},
            (charts.chartTop || charts.chartFaculty) ? {
                columns: [
                    charts.chartTop ? { image: charts.chartTop, width: 248, height: 165 } : { text: '' },
                    charts.chartFaculty ? { image: charts.chartFaculty, width: 248, height: 165, margin: [10, 0, 0, 0] } : { text: '' }
                ],
                margin: [0, 0, 0, 10]
            } : {},
            { text: '04 — FACULTY SUPERVISOR PERFORMANCE MATRIX', style: 'sectionHeader', margin: [0, 15, 0, 10], pageBreak: 'before' },
            {
                table: {
                    headerRows: 1, widths: ['*', 100, 100, 80],
                    body: [
                        [{ text: 'FACULTY SUPERVISOR NAME', style: 'tableHeader' }, { text: 'STUDENTS ASSIGNED', style: 'tableHeader' }, { text: 'COHORT AVG SCORE', style: 'tableHeader' }, { text: 'AVG GRADE', style: 'tableHeader' }],
                        ...(tables.faculty && tables.faculty.length > 0 ? tables.faculty.map((row, idx) => [{ text: s(row[0]), style: 'tableCell', bold: true, fillColor: idx % 2 !== 0 ? '#f8fafc' : null }, { text: s(row[1]), style: 'tableCell', alignment: 'center', fillColor: idx % 2 !== 0 ? '#f8fafc' : null }, { text: s(row[2]), style: 'tableCell', alignment: 'center', bold: true, color: '#1e40af', fillColor: idx % 2 !== 0 ? '#f8fafc' : null }, { text: s(row[3]), style: 'tableCell', alignment: 'center', bold: true, color: '#1e40af', fillColor: idx % 2 !== 0 ? '#f8fafc' : null }]) : [[{ text: 'No faculty data.', colSpan: 4, style: 'tableCell', alignment: 'center', italics: true }, {}, {}, {}]])
                    ]
                },
                layout: { hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 0.5, vLineWidth: () => 0, hLineColor: (i) => i === 1 ? '#1e3a8a' : '#e2e8f0', paddingTop: () => 9, paddingBottom: () => 9, paddingLeft: () => 8, paddingRight: () => 8 },
                margin: [0, 0, 0, 20]
            },
            { text: '05 — FULL STUDENT REGISTRY — INSTITUTIONAL GRADE LEDGER', style: 'sectionHeader', margin: [0, 15, 0, 8], pageBreak: 'before' },
            {
                table: {
                    headerRows: 1, widths: [48, 65, 45, 55, 60, 60, 48, 32, 22, 18, 18, 30],
                    body: [
                        [{ text: 'REG. NO', style: 'tableHeader' }, { text: 'NAME', style: 'tableHeader' }, { text: 'PHONE', style: 'tableHeader' }, { text: 'EMAIL (SEC)', style: 'tableHeader' }, { text: 'ACADEMIC SUP.', style: 'tableHeader' }, { text: 'SITE SUP.', style: 'tableHeader' }, { text: 'COMPANY', style: 'tableHeader' }, { text: 'MODE', style: 'tableHeader' }, { text: 'AVG', style: 'tableHeader' }, { text: '%', style: 'tableHeader' }, { text: 'GRD', style: 'tableHeader' }, { text: 'STATUS', style: 'tableHeader' }],
                        ...(tables.students && tables.students.length > 0 ? tables.students.map((row, idx) => {
                            const bg = idx % 2 !== 0 ? '#f8fafc' : null;
                            return [
                                { text: s(row[0]), style: 'tableCell', fontSize: 5.5, bold: true, fillColor: bg },
                                { text: s(row[1]), style: 'tableCell', fontSize: 6.5, bold: true, fillColor: bg },
                                { text: s(row[2]), style: 'tableCell', fontSize: 6, fillColor: bg },
                                { text: s(row[3]), style: 'tableCell', fontSize: 5.5, fillColor: bg },
                                { text: s(row[4]), style: 'tableCell', fontSize: 5.5, fillColor: bg },
                                { text: s(row[5]), style: 'tableCell', fontSize: 5.5, fillColor: bg },
                                { text: s(row[6]), style: 'tableCell', fontSize: 5.5, fillColor: bg },
                                { text: s(row[7]), style: 'tableCell', fontSize: 5.5, alignment: 'center', fillColor: bg },
                                { text: s(row[8]), style: 'tableCell', fontSize: 6, alignment: 'center', bold: true, fillColor: bg },
                                { text: s(row[9]), style: 'tableCell', fontSize: 6, alignment: 'center', bold: true, fillColor: bg },
                                { text: s(row[10]), style: 'tableCell', fontSize: 6, alignment: 'center', bold: true, color: '#1e40af', fillColor: bg },
                                { text: s(row[11]), style: 'tableCell', fontSize: 6, alignment: 'center', bold: true, color: statusColor(s(row[11])), fillColor: bg }
                            ];
                        }) : [[{ text: 'No student data available.', colSpan: 12, style: 'tableCell', alignment: 'center', italics: true }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]])
                    ]
                },
                layout: { hLineWidth: (i) => (i === 0 || i === 1) ? 2 : 0.3, vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 0.5 : 0.2, hLineColor: (i) => i === 1 ? '#1e3a8a' : '#e2e8f0', vLineColor: () => '#e2e8f0', paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 4, paddingRight: () => 4 },
                margin: [0, 0, 0, 20]
            }
        ],
        footer: (currentPage, pageCount) => ({
            columns: [
                { text: `CLASSIFICATION: RESTRICTED  ·  DIMS — CUI Abbottabad  ·  Generated: ${getPKTDate()} ${getPKTTime()}`, style: 'footerText', margin: [30, 18] },
                { text: `PAGE ${currentPage} / ${pageCount}`, style: 'footerText', alignment: 'right', margin: [30, 18] }
            ]
        }),
        styles: {
            uniName: { fontSize: 14, bold: true, color: '#1e3a8a' },
            campusName: { fontSize: 8, bold: true, color: '#475569', margin: [0, 2, 0, 6] },
            reportTitle: { fontSize: 13, bold: true, color: '#1e293b', margin: [0, 3, 0, 0] },
            reportTitle2: { fontSize: 11, bold: true, color: '#1e40af', margin: [0, 2, 0, 4] },
            reportSubTitle: { fontSize: 7.5, bold: true, color: '#94a3b8' },
            sectionHeader: { fontSize: 9.5, bold: true, color: '#1e3a8a', decoration: 'underline' },
            kpiLabel: { fontSize: 6.5, bold: true, color: '#64748b', alignment: 'center' },
            kpiValue: { fontSize: 22, bold: true, color: '#1e293b', alignment: 'center', margin: [0, 5, 0, 5] },
            tableHeader: { fontSize: 7.5, bold: true, fillColor: '#1e3a8a', color: 'white', alignment: 'center', margin: [0, 3, 0, 3] },
            tableCell: { fontSize: 7.5, margin: [0, 2, 0, 2], color: '#1e293b' },
            footerText: { fontSize: 6.5, color: '#94a3b8', italics: true }
        },
        defaultStyle: { font: 'Roboto' }
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="HOD_Internship_Performance_Dossier.pdf"');
    pdfDoc.pipe(res);
    pdfDoc.end();
}));

// @route   POST api/reports/hod-excel-report
// @desc    Generate a heavy-duty Institutional Audit Excel workbook with multi-sheet analytics
router.post('/hod-excel-report', protect, asyncHandler(async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DIMS — Institutional Reporting';
    workbook.lastModifiedBy = 'HOD Portal';
    workbook.created = new Date();

    // 🎨 Theme Definitions
    const NAVY = { argb: 'FF1E3A8A' };
    const WHITE = { argb: 'FFFFFFFF' };
    const GOLD = { argb: 'FFFFD700' };
    const LIGHT_BLUE = { argb: 'FFEFF6FF' };
    const BORDER = { style: 'thin', color: { argb: 'FFE2E8F0' } };

    const styleHeader = (ws, rowIdx) => {
        const row = ws.getRow(rowIdx);
        row.font = { bold: true, color: WHITE, size: 10 };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
        row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        row.height = 30;
    };

    // 1. DATA AGGREGATION ──────────────────────────────────────────────────
    // Fetch everything needed for deep analysis
    const [students, allMarks, assignments, supervisors, faculty] = await Promise.all([
        User.find({ role: 'student' }).populate('assignedFaculty', 'name email').populate('assignedSiteSupervisor', 'name email').lean(),
        Mark.find({}).lean(),
        Assignment.find({}).lean(),
        User.find({ role: 'site_supervisor' }).lean(),
        User.find({ role: 'faculty_supervisor' }).lean()
    ]);

    const activeAssignmentsCount = assignments.length;

    // 📊 Processing Logic
    const studentStats = [];
    const supervisorStats = {};
    const facultyStats = {};
    const companyStats = {};

    students.forEach(s => {
        const marks = allMarks.filter(m => m.student?.toString() === s._id.toString());
        const totalTasks = marks.filter(m => m.isFacultyGraded || m.isSiteSupervisorGraded).length;

        // Calculate Aggregate Score
        const free = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);
        const scores = marks.map(m => free ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2);
        const avg = marks.length > 0 ? (scores.reduce((a, b) => a + b, 0) / marks.length) : 0;
        const pct = Math.round((avg / 10) * 100);

        studentStats.push({
            reg: s.reg,
            name: s.name,
            company: s.assignedCompany || 'N/A',
            tasksPerformed: totalTasks,
            avgScore: avg.toFixed(2),
            percentage: pct,
            status: s.status,
            supervisor: s.assignedSiteSupervisor?.name || s.assignedCompanySupervisor || 'N/A',
            faculty: s.assignedFaculty?.name || 'N/A'
        });

        // 🏢 Company Analytics
        const cName = s.assignedCompany || 'Unassigned';
        if (!companyStats[cName]) companyStats[cName] = { name: cName, students: 0, totalMarks: 0, totalTasks: 0 };
        companyStats[cName].students++;
        companyStats[cName].totalMarks += pct;
        companyStats[cName].totalTasks += totalTasks;

        // 👔 Supervisor Analytics
        const supId = s.assignedSiteSupervisor?._id?.toString() || s.assignedCompanySupervisor;
        if (supId) {
            if (!supervisorStats[supId]) supervisorStats[supId] = { name: s.assignedSiteSupervisor?.name || s.assignedCompanySupervisor, students: 0, tasksGiven: 0, totalScore: 0 };
            supervisorStats[supId].students++;
            supervisorStats[supId].tasksGiven += marks.filter(m => m.isSiteSupervisorGraded).length;
            supervisorStats[supId].totalScore += pct;
        }

        // 🎓 Faculty Analytics
        const fId = s.assignedFaculty?._id?.toString();
        if (fId) {
            if (!facultyStats[fId]) facultyStats[fId] = { name: s.assignedFaculty.name, students: 0, unmarked: 0, marked: 0 };
            facultyStats[fId].students++;
            facultyStats[fId].marked += marks.filter(m => m.isFacultyGraded).length;
            // Unmarked = (Number of assignments * number of students) - number of graded marks
            // But we only count if student has actually submitted/created a mark object or if we assume all assignment exist for all
            // For now, let's track missing graded marks for existing submissions
            facultyStats[fId].unmarked += marks.filter(m => !m.isFacultyGraded).length;
        }
    });

    // 2. SHEET: EXECUTIVE DASHBOARD ──────────────────────────────────────────
    const sh0 = workbook.addWorksheet('Executive Dashboard', { views: [{ showGridLines: false }] });
    sh0.getColumn(1).width = 45;
    sh0.getColumn(2).width = 35;
    sh0.getColumn(3).width = 25;
    sh0.getColumn(4).width = 25;

    // Title Section
    sh0.mergeCells('A1:D1');
    const titleCell = sh0.getCell('A1');
    titleCell.value = 'INSTITUTIONAL PERFORMANCE AUDIT & EXECUTIVE DASHBOARD';
    titleCell.font = { bold: true, size: 20, color: NAVY };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sh0.getRow(1).height = 45;

    sh0.mergeCells('A2:D2');
    const subCell = sh0.getCell('A2');
    subCell.value = `Academic Cycle: ${new Date().getFullYear()}   |   Generated On: ${getPKTDate()} at ${getPKTTime()}`;
    subCell.font = { size: 10, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sh0.getRow(2).height = 20;

    sh0.addRow([]);

    // Logic for Completion
    const sortedCos = Object.values(companyStats).sort((a, b) => (b.totalMarks / b.students) - (a.totalMarks / a.students));
    const sortedTasks = Object.values(companyStats).sort((a, b) => b.totalTasks - a.totalTasks);
    const sortedFac = Object.values(facultyStats).sort((a, b) => a.unmarked - b.unmarked);
    const allGraded = sortedFac.length > 0 && sortedFac.every(f => f.unmarked === 0);

    // Header for Summary Table
    const headerRow = sh0.addRow(['ANALYSIS CATEGORY', 'TOP PERFORMING ENTITY', 'KEY METRIC', 'VALUE / COUNT']);
    styleHeader(sh0, headerRow.number);

    const leaderData = [
        ['Highest Performing Company (Avg Grade)', sortedCos[0]?.name || 'N/A', 'Avg Success Rate', sortedCos[0] ? `${Math.round(sortedCos[0].totalMarks / sortedCos[0].students)}%` : '0%'],
        ['Most Active Company (Task Volume)', sortedTasks[0]?.name || 'N/A', 'Tasks Completed', sortedTasks[0]?.totalTasks || 0],
        ['Highest Performing Faculty (Evaluations)',
            allGraded ? 'AUDIT COMPLETED' : (sortedFac[0]?.name || 'N/A'),
            allGraded ? 'STATUS' : 'Pending Tasks',
            allGraded ? '100% GRADED' : (sortedFac[0]?.unmarked || 0)],
        ['Least Performing Faculty (Evaluations)',
            allGraded ? 'N/A' : (sortedFac[sortedFac.length - 1]?.name || 'N/A'),
            allGraded ? 'REMARK' : 'Pending Tasks',
            allGraded ? 'Everyone has Marked Every Task' : (sortedFac[sortedFac.length - 1]?.unmarked || 0)]
    ];

    leaderData.forEach((ld, idx) => {
        const r = sh0.addRow(ld);
        r.height = 30;
        r.alignment = { vertical: 'middle' };
        r.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };
        r.getCell(2).font = { bold: true, color: NAVY };
        r.getCell(4).font = { bold: true, color: (idx === 3 && !allGraded ? { argb: 'FFDC2626' } : { argb: 'FF059669' }) };

        r.eachCell(c => {
            c.border = BORDER;
            if (idx % 2 !== 0) c.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_BLUE };
        });
    });

    sh0.addRow([]);
    sh0.addRow(['* This institutional audit is strictly for departmental review and archival purposes.']).font = { size: 9, italic: true, color: { argb: 'FF64748B' } };

    // 3. SHEET: STUDENT RECORDS ──────────────────────────────────────────
    const sh1 = workbook.addWorksheet('Student Achievement Register');
    sh1.columns = [
        { header: 'REGISTRATION #', key: 'reg', width: 22 },
        { header: 'FULL NAME', key: 'name', width: 30 },
        { header: 'AFFILIATED COMPANY', key: 'company', width: 30 },
        { header: 'SITE SUPERVISOR', key: 'sup', width: 30 },
        { header: 'ACADEMIC SUPERVISOR', key: 'fac', width: 30 },
        { header: 'TASKS COMPLETED', key: 'tasks', width: 15 },
        { header: 'AVG / 10', key: 'avg', width: 12 },
        { header: '% SCORE', key: 'pct', width: 12 },
        { header: 'STATUS', key: 'status', width: 20 }
    ];
    styleHeader(sh1, 1);
    studentStats.forEach((s, i) => {
        const r = sh1.addRow(s);
        r.height = 25;
        r.alignment = { vertical: 'middle' };
        if (i % 2 !== 0) r.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_BLUE });
        r.getCell('pct').font = { bold: true, color: s.percentage >= 50 ? { argb: 'FF059669' } : { argb: 'FFDC2626' } };
        r.eachCell(c => c.border = BORDER);
    });

    // 4. SHEET: SUPERVISOR ANALYTICS ───────────────────────────────────────
    const sh2 = workbook.addWorksheet('Supervisor Insights');
    sh2.columns = [
        { header: 'SUPERVISOR NAME', key: 'name', width: 35 },
        { header: 'INTERNS ASSIGNED', key: 'students', width: 22 },
        { header: 'TASKS EVALUATED', key: 'tasks', width: 22 },
        { header: 'COHORT AVG GRADE', key: 'avg', width: 22 }
    ];
    styleHeader(sh2, 1);
    Object.values(supervisorStats).forEach((s, i) => {
        const r = sh2.addRow({
            name: s.name,
            students: s.students,
            tasks: s.tasksGiven,
            avg: `${Math.round(s.totalScore / s.students)}%`
        });
        r.height = 25;
        r.alignment = { vertical: 'middle' };
        if (i % 2 !== 0) r.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_BLUE });
        r.eachCell(c => c.border = BORDER);
    });

    // 5. SHEET: FACULTY ANALYTICS ──────────────────────────────────────────
    const sh3 = workbook.addWorksheet('Faculty Workload Audit');
    sh3.columns = [
        { header: 'FACULTY NAME', key: 'name', width: 35 },
        { header: 'STUDENTS MAPPED', key: 'students', width: 22 },
        { header: 'TASKS GRADED', key: 'marked', width: 22 },
        { header: 'TASKS PENDING', key: 'unmarked', width: 22 }
    ];
    styleHeader(sh3, 1);
    Object.values(facultyStats).forEach((s, i) => {
        const r = sh3.addRow(s);
        r.height = 25;
        r.alignment = { vertical: 'middle' };
        if (i % 2 !== 0) r.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_BLUE });
        const pc = r.getCell('unmarked');
        if (s.unmarked > 5) pc.font = { color: { argb: 'FFDC2626' }, bold: true };
        r.eachCell(c => c.border = BORDER);
    });

    // Finalize
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Institutional_Audit_Dossier.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
}));

export default router;
