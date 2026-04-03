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
import Phase from '../models/Phase.js';
import AuditLog from '../models/AuditLog.js';
import Submission from '../models/Submission.js';
import { getArchiveSnapshot } from '../utils/archiver.js';
import Archive from '../models/Archive.js';
import { uploadCloudinaryBuffer } from '../utils/cloudinary.js';

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
// @desc    Generate a premium general-purpose report (e.g. Student List)
router.post('/generate-pdf', protect, asyncHandler(async (req, res) => {
    const {
        reportTitle = 'Student Report',
        supervisorName = req.user?.name || 'Not Assigned',
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
        pageMargins: [30, 40, 30, 50],
        background: (currentPage, pageSize) => ({
            canvas: [
                { type: 'rect', x: 0, y: 0, w: pageSize.width, h: 5, color: '#1e3a8a' },
                { type: 'rect', x: 0, y: pageSize.height - 5, w: pageSize.width, h: 5, color: '#1e3a8a' }
            ]
        }),
        content: [
            {
                columns: [
                    logoBase64 ? { image: logoBase64, width: 68 } : { text: '', width: 68 },
                    {
                        stack: [
                            { text: 'COMSATS UNIVERSITY ISLAMABAD', style: 'uniName' },
                            { text: 'ABBOTTABAD CAMPUS • DEPARTMENT OF COMPUTER SCIENCE', style: 'campusName' },
                            { text: reportTitle.toUpperCase(), style: 'reportTitle' },
                        ],
                        alignment: 'right',
                        margin: [0, 5, 0, 0]
                    }
                ],
                margin: [0, 0, 0, 30]
            },
            {
                stack: [
                    {
                        columns: [
                            { text: 'INSTITUTIONAL METADATA', style: 'sectionLabel', width: 140 },
                            { canvas: [{ type: 'line', x1: 0, y1: 7, x2: 350, y2: 7, lineWidth: 0.5, color: '#e2e8f0' }] }
                        ],
                        margin: [0, 0, 0, 12]
                    },
                    {
                        columns: [
                            {
                                stack: [
                                    { text: 'PRIMARY SUPERVISOR', style: 'infoLabel' },
                                    { text: supervisorName || 'Not Assigned', style: 'infoValue' }
                                ]
                            },
                            {
                                stack: [
                                    { text: 'REPORT CLASSIFICATION', style: 'infoLabel' },
                                    { text: 'INTERNAL / DEPT USE ONLY', style: 'infoValue', color: '#1e3a8a' }
                                ]
                            },
                            {
                                stack: [
                                    { text: 'GENERATED ON', style: 'infoLabel' },
                                    { text: `${getPKTDate()} at ${getPKTTime()}`, style: 'infoValue' }
                                ]
                            }
                        ]
                    }
                ],
                margin: [0, 0, 0, 35]
            },
            {
                table: {
                    headerRows: 1,
                    widths: columnsLayout,
                    body: [
                        tableHeader.map(h => ({ text: h.toUpperCase(), style: 'tableHeader' })),
                        ...tableData.map((row, idx) => row.map(cell => ({
                            text: String(cell || 'N/A'),
                            style: 'tableCell',
                            fillColor: idx % 2 !== 0 ? '#f8fafc' : null,
                            alignment: (cell && (cell.toString().includes('CIIT/') || !isNaN(cell) || cell.toString().length < 5)) ? 'center' : 'left'
                        })))
                    ]
                },
                layout: {
                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.2 : 0.2,
                    vLineWidth: () => 0,
                    hLineColor: (i) => i === 1 ? '#1e3a8a' : '#e2e8f0',
                    paddingLeft: () => 10, paddingRight: () => 10,
                    paddingTop: () => 10, paddingBottom: () => 10,
                }
            }
        ],
        footer: (currentPage, pageCount) => ({
            columns: [
                { text: `DIMS PLATFORM • AUDIT LOG • ${getPKTDate()}`, style: 'footerText', margin: [30, 15] },
                { text: `PAGE ${currentPage} OF ${pageCount}`, style: 'footerText', alignment: 'right', margin: [30, 15] }
            ]
        }),
        styles: {
            uniName: { fontSize: 13, bold: true, color: '#1e3a8a', letterSpacing: 1 },
            campusName: { fontSize: 8, bold: true, color: '#64748b', margin: [0, 2, 0, 4] },
            reportTitle: { fontSize: 16, bold: true, color: '#0f172a', margin: [0, 2, 0, 0] },
            sectionLabel: { fontSize: 8, bold: true, color: '#94a3b8', letterSpacing: 1 },
            infoLabel: { fontSize: 7, bold: true, color: '#94a3b8', margin: [0, 0, 0, 2] },
            infoValue: { fontSize: 9, bold: true, color: '#334155' },
            tableHeader: { fontSize: 8, bold: true, fillColor: '#1e3a8a', color: 'white', margin: [0, 4, 0, 4], alignment: 'center' },
            tableCell: { fontSize: 8, margin: [0, 2, 0, 2], color: '#334155' },
            footerText: { fontSize: 7, italic: true, color: '#94a3b8', bold: true }
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
    const successRate = Math.round(((stats.passed || 0) / (stats.participating || 1)) * 100);

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [30, 45, 30, 55],
        background: (currentPage, pageSize) => ({
            canvas: [
                { type: 'rect', x: 0, y: 0, w: pageSize.width, h: 8, color: '#1e3a8a' },
                { type: 'rect', x: 0, y: pageSize.height - 8, w: pageSize.width, h: 8, color: '#1e3a8a' }
            ]
        }),
        content: [
            {
                columns: [
                    logoBase64 ? { image: logoBase64, width: 85, margin: [0, 5, 0, 0] } : { text: '', width: 85 },
                    {
                        stack: [
                            { text: 'COMSATS UNIVERSITY ISLAMABAD', style: 'uniName' },
                            { text: 'ABBOTTABAD CAMPUS • DEPARTMENT OF COMPUTER SCIENCE', style: 'campusName' },
                            { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 400, y2: 2, lineWidth: 2, color: '#1e3a8a' }], margin: [0, 0, 0, 8] },
                            { text: 'INTERNSHIP PROGRAMME MANAGEMENT OFFICE', style: 'reportTitle' },
                            { text: 'INSTITUTIONAL PERFORMANCE & AUDIT DOSSIER', style: 'reportTitle2' },
                            { text: `ACADEMIC CYCLE: ${new Date().getFullYear()}   |   CLASSIFICATION: RESTRICTED   |   ${getPKTDate()}`, style: 'reportSubTitle' },
                        ],
                        margin: [15, 0, 0, 0]
                    }
                ],
                margin: [0, 0, 0, 35]
            },

            {
                stack: [
                    { text: '01 — EXECUTIVE INSTITUTIONAL SUMMARY', style: 'sectionHeader', margin: [0, 0, 0, 8] },
                    {
                        text: [
                            { text: 'OVERVIEW: ', bold: true, color: '#1e3a8a' },
                            'This comprehensive performance audit provides a high-fidelity mapping of the current internship cohort within the Department of Computer Science. ',
                            `With a participation count of ${stats.participating} students and an overall success rate of ${successRate}%, the institutional quality metrics remain within target parameters. `,
                            'This dossier is classified as RESTRICTED and is intended for departmental oversight and curriculum alignment purposes only.'
                        ],
                        style: 'summaryText'
                    }
                ],
                margin: [0, 0, 0, 25]
            },

            { text: '02 — COHORT PARTICIPATION ANATOMY', style: 'sectionHeader', margin: [0, 0, 0, 10] },
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
                    hLineWidth: (i) => (i === 0 || i === 2) ? 2 : 0,
                    vLineWidth: () => 0,
                    hLineColor: (i) => (i === 0 || i === 2) ? '#1e3a8a' : '#e2e8f0',
                    paddingTop: () => 12, paddingBottom: () => 12,
                    fillColor: (i) => i === 0 ? '#eff6ff' : null
                },
                margin: [0, 0, 0, 25]
            },

            { text: '03 — ACADEMIC PERFORMANCE OVERVIEW', style: 'sectionHeader', margin: [0, 0, 0, 10] },
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
                            { text: `${successRate}%`, style: 'kpiValue', color: '#059669' },
                            { text: s(stats.passed), style: 'kpiValue', color: '#059669' },
                            { text: s(stats.failed), style: 'kpiValue', color: '#dc2626' },
                            { text: `${stats.avgPct || 0}%  (${s(stats.avgGrade)})`, style: 'kpiValue', color: '#6366f1' }
                        ]
                    ]
                },
                layout: {
                    hLineWidth: (i) => (i === 0 || i === 2) ? 2 : 0,
                    vLineWidth: () => 0,
                    hLineColor: (i) => (i === 0 || i === 2) ? '#1e3a8a' : '#e2e8f0',
                    paddingTop: () => 12, paddingBottom: () => 12,
                    fillColor: (i) => i === 0 ? '#eff6ff' : null
                },
                margin: [0, 0, 0, 30]
            },

            { text: '04 — VISUAL PERFORMANCE ANALYTICS', style: 'sectionHeader', margin: [0, 15, 0, 15], pageBreak: 'before' },
            (charts.chartDist || charts.chartPie) ? {
                columns: [
                    charts.chartDist ? { image: charts.chartDist, width: 280, height: 160 } : { text: '' },
                    charts.chartPie ? { image: charts.chartPie, width: 220, height: 160, margin: [10, 0, 0, 0] } : { text: '' }
                ],
                margin: [0, 0, 0, 25]
            } : {},
            (charts.chartTop || charts.chartFaculty) ? {
                columns: [
                    charts.chartTop ? { image: charts.chartTop, width: 260, height: 180 } : { text: '' },
                    charts.chartFaculty ? { image: charts.chartFaculty, width: 260, height: 180, margin: [10, 0, 0, 0] } : { text: '' }
                ],
                margin: [0, 0, 0, 20]
            } : {},

            { text: '05 — SUPERVISOR PERFORMANCE MATRIX', style: 'sectionHeader', margin: [0, 25, 0, 12], pageBreak: 'before' },
            {
                table: {
                    headerRows: 1, widths: ['*', 100, 100, 80],
                    body: [
                        [{ text: 'FACULTY SUPERVISOR NAME', style: 'tableHeader' }, { text: 'STUDENTS ASSIGNED', style: 'tableHeader' }, { text: 'COHORT AVG SCORE', style: 'tableHeader' }, { text: 'AVG GRADE', style: 'tableHeader' }],
                        ...(tables.faculty && tables.faculty.length > 0 ? tables.faculty.map((row, idx) => [{ text: s(row[0]).toUpperCase(), style: 'tableCell', bold: true, fillColor: idx % 2 !== 0 ? '#f8fafc' : null }, { text: s(row[1]), style: 'tableCell', alignment: 'center', fillColor: idx % 2 !== 0 ? '#f8fafc' : null }, { text: s(row[2]), style: 'tableCell', alignment: 'center', bold: true, color: '#1e40af', fillColor: idx % 2 !== 0 ? '#f8fafc' : null }, { text: s(row[3]), style: 'tableCell', alignment: 'center', bold: true, color: '#1e40af', fillColor: idx % 2 !== 0 ? '#f8fafc' : null }]) : [[{ text: 'No faculty data.', colSpan: 4, style: 'tableCell', alignment: 'center', italics: true }, {}, {}, {}]])
                    ]
                },
                layout: { hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 0.2, vLineWidth: () => 0, hLineColor: (i) => i === 1 ? '#1e3a8a' : '#e2e8f0', paddingTop: () => 11, paddingBottom: () => 11, paddingLeft: () => 10, paddingRight: () => 10 },
                margin: [0, 0, 0, 25]
            },

            { text: '06 — INSTITUTIONAL STUDENT REGISTRY (COMPREHENSIVE LEDGER)', style: 'sectionHeader', margin: [0, 20, 0, 10], pageBreak: 'before' },
            {
                table: {
                    headerRows: 1, widths: [48, 65, 45, 55, 60, 60, 48, 32, 22, 18, 18, 30],
                    body: [
                        [{ text: 'REG. NO', style: 'tableHeader' }, { text: 'NAME', style: 'tableHeader' }, { text: 'PHONE', style: 'tableHeader' }, { text: 'EMAIL (SEC)', style: 'tableHeader' }, { text: 'ACAD SUP.', style: 'tableHeader' }, { text: 'SITE SUP.', style: 'tableHeader' }, { text: 'COMPANY', style: 'tableHeader' }, { text: 'MODE', style: 'tableHeader' }, { text: 'AVG', style: 'tableHeader' }, { text: '%', style: 'tableHeader' }, { text: 'GRDS', style: 'tableHeader' }, { text: 'STATUS', style: 'tableHeader' }],
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
                layout: { 
                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 0.1, 
                    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 0.3 : 0.1, 
                    hLineColor: (i) => i === 1 ? '#1e3a8a' : '#cbd5e1', 
                    vLineColor: () => '#cbd5e1', 
                    paddingTop: () => 6, paddingBottom: () => 6, 
                    paddingLeft: () => 4, paddingRight: () => 4 
                },
                margin: [0, 0, 0, 30]
            }
        ],
        footer: (currentPage, pageCount) => ({
            columns: [
                { text: `SYSTEM CLASSIFICATION: RESTRICTED PROTECTED  •  DIMS — CUI Abbottabad  •  Audit ID: ${Date.now().toString(36).toUpperCase()}`, style: 'footerText', margin: [30, 18] },
                { text: `PAGE ${currentPage} / ${pageCount}`, style: 'footerText', alignment: 'right', margin: [30, 18] }
            ]
        }),
        styles: {
            uniName: { fontSize: 13, bold: true, color: '#1e3a8a', letterSpacing: 1 },
            campusName: { fontSize: 7, bold: true, color: '#64748b', margin: [0, 2, 0, 6] },
            reportTitle: { fontSize: 12, bold: true, color: '#1e293b', margin: [0, 4, 0, 0], letterSpacing: 0.5 },
            reportTitle2: { fontSize: 10, bold: true, color: '#1e40af', margin: [0, 2, 0, 5] },
            reportSubTitle: { fontSize: 7, bold: true, color: '#94a3b8', letterSpacing: 0.5 },
            sectionHeader: { fontSize: 9, bold: true, color: '#1e3a8a', letterSpacing: 1, margin: [0, 5, 0, 5] },
            summaryText: { fontSize: 8.5, color: '#475569', lineHeight: 1.4 },
            kpiLabel: { fontSize: 7, bold: true, color: '#94a3b8', alignment: 'center', letterSpacing: 0.5 },
            kpiValue: { fontSize: 24, bold: true, color: '#1e293b', alignment: 'center', margin: [0, 6, 0, 6] },
            tableHeader: { fontSize: 7.5, bold: true, fillColor: '#1e3a8a', color: 'white', alignment: 'center', margin: [0, 4, 0, 4] },
            tableCell: { fontSize: 7.5, margin: [0, 3, 0, 3], color: '#1e293b' },
            footerText: { fontSize: 6.5, color: '#94a3b8', italics: true, bold: true }
        },
        defaultStyle: { font: 'Roboto' }
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    const { archiveId } = req.body;

    if (archiveId) {
        const chunks = [];
        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            try {
                const cloudRes = await uploadCloudinaryBuffer(buffer, `HOD_Archive_Dossier_${archiveId}.pdf`, 'dims/archives');
                await Archive.findByIdAndUpdate(archiveId, { pdfUrl: cloudRes.secure_url });
                res.status(200).json({ url: cloudRes.secure_url });
            } catch (err) {
                console.error('Archive PDF Save Error:', err);
                res.status(500).json({ message: 'Failed to save PDF to archive.' });
            }
        });
        pdfDoc.end();
    } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="HOD_Institutional_Audit_Dossier.pdf"');
        pdfDoc.pipe(res);
        pdfDoc.end();
    }
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
    const { archiveId: targetArchiveId } = req.body;
    let studentStats = [];
    let supervisorStats = {};
    let facultyStats = {};
    let companyStats = {};

    if (targetArchiveId && targetArchiveId !== 'live-snapshot-id') {
        const archive = await Archive.findById(targetArchiveId).lean();
        if (!archive) return res.status(404).json({ message: 'Archive not found' });

        archive.students.forEach(s => {
            const pct = s.percentage || 0;
            const tasksPerformed = (s.marks || []).filter(m => m.isFacultyGraded).length;
            
            studentStats.push({
                reg: s.reg,
                name: s.name,
                company: s.company || 'N/A',
                tasksPerformed,
                avgScore: (s.avgMarks || 0).toFixed(2),
                percentage: pct,
                status: s.status,
                supervisor: s.siteSupervisor?.name || 'N/A',
                faculty: s.faculty?.name || 'N/A'
            });

            const cName = s.company || 'Unassigned';
            if (!companyStats[cName]) companyStats[cName] = { name: cName, students: 0, totalMarks: 0, totalTasks: 0 };
            companyStats[cName].students++;
            companyStats[cName].totalMarks += pct;
            companyStats[cName].totalTasks += tasksPerformed;

            const supName = s.siteSupervisor?.name || 'Unassigned';
            if (!supervisorStats[supName]) supervisorStats[supName] = { name: supName, students: 0, tasksGiven: 0, totalScore: 0 };
            supervisorStats[supName].students++;
            supervisorStats[supName].totalScore += pct;

            const fName = s.faculty?.name || 'Unassigned';
            if (!facultyStats[fName]) facultyStats[fName] = { name: fName, students: 0, unmarked: 0, marked: 0 };
            facultyStats[fName].students++;
            facultyStats[fName].marked += tasksPerformed;
        });
    } else {
        const [students, allMarks, assignments, supervisors, faculty] = await Promise.all([
            User.find({ role: 'student' }).populate('assignedFaculty', 'name email').populate('assignedSiteSupervisor', 'name email').lean(),
            Mark.find({}).lean(),
            Assignment.find({}).lean(),
            User.find({ role: 'site_supervisor' }).lean(),
            User.find({ role: 'faculty_supervisor' }).lean()
        ]);

        students.forEach(s => {
            const marks = allMarks.filter(m => m.student?.toString() === s._id.toString());
            const totalTasks = marks.filter(m => m.isFacultyGraded || m.isSiteSupervisorGraded).length;
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

            const cName = s.assignedCompany || 'Unassigned';
            if (!companyStats[cName]) companyStats[cName] = { name: cName, students: 0, totalMarks: 0, totalTasks: 0 };
            companyStats[cName].students++;
            companyStats[cName].totalMarks += pct;
            companyStats[cName].totalTasks += totalTasks;

            const supId = s.assignedSiteSupervisor?._id?.toString() || s.assignedCompanySupervisor;
            if (supId) {
                if (!supervisorStats[supId]) supervisorStats[supId] = { name: s.assignedSiteSupervisor?.name || s.assignedCompanySupervisor, students: 0, tasksGiven: 0, totalScore: 0 };
                supervisorStats[supId].students++;
                supervisorStats[supId].tasksGiven += marks.filter(m => m.isSiteSupervisorGraded).length;
                supervisorStats[supId].totalScore += pct;
            }

            const fId = s.assignedFaculty?._id?.toString();
            if (fId) {
                if (!facultyStats[fId]) facultyStats[fId] = { name: s.assignedFaculty.name, students: 0, unmarked: 0, marked: 0 };
                facultyStats[fId].students++;
                facultyStats[fId].marked += marks.filter(m => m.isFacultyGraded).length;
                facultyStats[fId].unmarked += marks.filter(m => !m.isFacultyGraded).length;
            }
        });
    }

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
    if (targetArchiveId && targetArchiveId !== 'live-snapshot-id') {
        const buffer = await workbook.xlsx.writeBuffer();
        try {
            const cloudRes = await uploadCloudinaryBuffer(buffer, `Institutional_Audit_Dossier_${targetArchiveId}.xlsx`, 'dims/archives');
            await Archive.findByIdAndUpdate(targetArchiveId, { excelUrl: cloudRes.secure_url });
            res.status(200).json({ url: cloudRes.secure_url });
        } catch (err) {
            console.error('Archive Excel Save Error:', err);
            res.status(500).json({ message: 'Failed to save Excel to archive.' });
        }
    } else {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Institutional_Audit_Dossier.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    }
}));

// @route   GET api/reports/hod-premium-stats
// @desc    Get comprehensive institutional data for high-fidelity HEC-standard reports
router.get('/hod-premium-stats', protect, asyncHandler(async (req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [phases, students, allMarks, assignments, submissions, auditLogs, companies, supervisors] = await Promise.all([
        Phase.find({}).sort({ order: 1 }).lean(),
        User.find({ role: 'student' }).populate('assignedFaculty assignedSiteSupervisor').lean(),
        Mark.find({}).lean(),
        Assignment.find({}).lean(),
        Submission.find({}).lean(),
        AuditLog.find({ timestamp: { $gt: thirtyDaysAgo } }).populate('performedBy').lean(),
        Company.find({}).lean(),
        User.find({ role: { $in: ['faculty_supervisor', 'site_supervisor', 'internship_office', 'hod'] } }).lean()
    ]);

    // 1. Process Student Performance & Buckets
    const processedStudents = students.map(s => {
        const marks = allMarks.filter(m => m.student?.toString() === s._id.toString());
        const free = s.internshipRequest?.mode === 'Freelance' || (!s.assignedSiteSupervisor && !s.assignedCompanySupervisor);
        const scores = marks.map(m => free ? (m.facultyMarks || 0) : ((m.facultyMarks || 0) + (m.siteSupervisorMarks || 0)) / 2);
        const avg = marks.length > 0 ? (scores.reduce((a, b) => a + b, 0) / marks.length) : 0;
        const pct = Math.round((avg / 10) * 100);

        return {
            _id: s._id,
            reg: s.reg,
            name: s.name,
            email: s.email,
            company: s.assignedCompany || 'N/A',
            faculty: s.assignedFaculty?.name || 'N/A',
            siteSupervisor: s.assignedSiteSupervisor?.name || s.siteSupervisorName || 'N/A',
            percentage: pct,
            status: s.status,
            assignmentsCount: marks.length
        };
    }).filter(s => s.status !== 'Ineligible');

    const sorted = [...processedStudents].sort((a, b) => b.percentage - a.percentage);
    const top = sorted.slice(0, 5);
    const bottom = [...sorted].reverse().slice(0, 5).filter(s => !top.some(t => t.reg === s.reg));
    const midIdx = Math.floor(sorted.length / 2);
    const middle = sorted.slice(Math.max(0, midIdx - 2), midIdx + 3).filter(s => !top.some(t => t.reg === s.reg) && !bottom.some(b => b.reg === s.reg));

    // 2. Completion Statistics
    const compStats = {
        total: students.length,
        completed: processedStudents.filter(s => s.status === 'Graduated').length,
        inProgress: processedStudents.filter(s => s.status === 'Active').length,
        overdue: processedStudents.filter(s => {
            const marks = allMarks.filter(m => m.student?.toString() === s._id.toString());
            if (marks.length === 0) return true;
            const lastMark = marks.sort((a, b) => b.createdAt - a.createdAt)[0];
            return (new Date() - new Date(lastMark.createdAt)) > (14 * 24 * 60 * 60 * 1000);
        }).length,
        withdrawn: students.filter(s => s.status === 'Withdrawn').length
    };

    // 3. Role-Wise Activity Log (Last 30 Days) - Simplified for HEC
    const roleStats = {
        'Site Supervisor': auditLogs.filter(log => log.performedBy?.role === 'site_supervisor').length,
        'Faculty Supervisor': auditLogs.filter(log => log.performedBy?.role === 'faculty_supervisor').length,
        'Internship Office': auditLogs.filter(log => log.performedBy?.role === 'internship_office').length,
        'HOD': auditLogs.filter(log => log.performedBy?.role === 'hod').length
    };

    // 4. Detailed Faculty Performance Activity
    const facultyPerformance = supervisors.filter(s => s.role === 'faculty_supervisor').map(f => {
        const assigned = processedStudents.filter(s => s.faculty === f.name);
        const graded = allMarks.filter(m => m.facultyId?.toString() === f._id.toString() && m.isFacultyGraded).length;
        const totalPossible = assigned.length * assignments.length;
        
        return {
            name: f.name,
            students: assigned.length,
            gradedCount: graded,
            completionPct: totalPossible > 0 ? Math.round((graded / totalPossible) * 100) : 0,
            avgScoreGiven: assigned.length > 0 ? Math.round(assigned.reduce((a, b) => a + b.percentage, 0) / assigned.length) : 'N/A'
        };
    }).sort((a, b) => b.students - a.students);

    // 5. Detailed Site Supervisor Activity
    const siteSupervisorPerformance = supervisors.filter(s => s.role === 'site_supervisor').map(ss => {
        const assigned = processedStudents.filter(s => s.siteSupervisor === ss.name);
        const graded = allMarks.filter(m => m.siteSupervisorId?.toString() === ss._id.toString() && m.isSiteSupervisorGraded).length;
        
        return {
            name: ss.name,
            company: ss.company || 'N/A',
            students: assigned.length,
            evalsCompleted: graded,
            lastActivity: auditLogs.find(l => l.performedBy?._id?.toString() === ss._id.toString())?.timestamp || 'N/A'
        };
    }).sort((a, b) => b.students - a.students);

    // 6. Company Participation Report
    const companyReports = companies.slice(0, 10).map(c => {
        const interns = processedStudents.filter(s => s.company === c.name);
        return {
            name: c.name,
            interns: interns.length,
            supervisors: supervisors.filter(sup => sup.role === 'site_supervisor' && sup.company === c.name).length || 1,
            avgGrade: interns.length > 0 ? (interns.reduce((a, b) => a + b.percentage, 0) / interns.length).toFixed(1) + '%' : 'N/A'
        };
    });

    // 7. Grade Distribution
    const grades = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0 };
    processedStudents.forEach(s => {
        if (s.percentage >= 90) grades['A+']++;
        else if (s.percentage >= 80) grades['A']++;
        else if (s.percentage >= 70) grades['B+']++;
        else if (s.percentage >= 60) grades['B']++;
        else if (s.percentage >= 50) grades['C']++;
        else grades['F']++;
    });

    res.json({
        phases,
        compStats,
        roleStats,
        facultyPerformance,
        siteSupervisorPerformance,
        companyReports,
        gradeDist: Object.entries(grades).map(([g, c]) => ({ grade: g, count: c, pct: processedStudents.length > 0 ? ((c / processedStudents.length) * 100).toFixed(1) + '%' : '0%' })),
        buckets: { top, middle, bottom },
        generatedAt: { date: getPKTDate(), time: getPKTTime() }
    });
}));

// @route   GET api/reports/archive-preview
// @desc    Get a real-time snapshot of the current cycle as it would be archived
router.get('/archive-preview', protect, asyncHandler(async (req, res) => {
    const snapshot = await getArchiveSnapshot();
    res.json(snapshot);
}));

export default router;
