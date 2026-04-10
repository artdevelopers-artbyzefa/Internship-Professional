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

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: High-fidelity PDF and Excel reporting engines
 */

/**
 * @swagger
 * /reports/generate-pdf:
 *   post:
 *     summary: Generate a premium industrial-themed PDF report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reportTitle: { type: string }
 *               supervisorName: { type: string }
 *               tableHeader: { type: array, items: { type: string } }
 *               tableData: { type: array, items: { type: array, items: { type: string } } }
 *     responses:
 *       200:
 *         description: PDF binary stream
 */
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

/**
 * @swagger
 * /reports/hod-full-report:
 *   post:
 *     summary: Generate the comprehensive HOD Institutional Performance Dossier (PDF)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
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

/**
 * @swagger
 * /reports/hod-excel-report:
 *   post:
 *     summary: Generate a multi-sheet Institutional Audit Excel workbook
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
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
                tasks: tasksPerformed,
                avg: (s.avgMarks || 0).toFixed(2),
                pct: pct,
                status: s.status,
                sup: s.siteSupervisor?.name || 'N/A',
                fac: s.faculty?.name || 'N/A',
                percentage: pct
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
                tasks: totalTasks,
                avg: avg.toFixed(2),
                pct: pct,
                status: s.status,
                sup: s.assignedSiteSupervisor?.name || s.assignedCompanySupervisor || 'N/A',
                fac: s.assignedFaculty?.name || 'N/A',
                percentage: pct
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

    // Helper: compute letter grade from percentage
    const getLetterGrade = (pct) => {
        if (pct >= 90) return 'A+';
        if (pct >= 80) return 'A';
        if (pct >= 70) return 'B+';
        if (pct >= 60) return 'B';
        if (pct >= 50) return 'C';
        return 'F';
    };

    // Build per-supervisor student lists
    const supervisorStudents = {};
    studentStats.forEach(s => {
        const key = s.sup || 'Unassigned';
        if (!supervisorStudents[key]) supervisorStudents[key] = [];
        supervisorStudents[key].push(s);
    });

    // Build per-faculty student lists
    const facultyStudents = {};
    studentStats.forEach(s => {
        const key = s.fac || 'Unassigned';
        if (!facultyStudents[key]) facultyStudents[key] = [];
        facultyStudents[key].push(s);
    });

    // Build per-company student lists
    const companyStudents = {};
    studentStats.forEach(s => {
        const key = s.company || 'Unassigned';
        if (!companyStudents[key]) companyStudents[key] = { supervisor: s.sup || 'N/A', students: [] };
        companyStudents[key].students.push(s);
    });

    // ── SHEET 1: STUDENT MASTER REGISTER ─────────────────────────────────
    const sh1 = workbook.addWorksheet('Student Master Register');
    sh1.columns = [
        { header: 'Registration #', key: 'reg', width: 24 },
        { header: 'Full Name', key: 'name', width: 28 },
        { header: 'Affiliated Company', key: 'company', width: 28 },
        { header: 'Site Supervisor', key: 'sup', width: 28 },
        { header: 'Faculty Supervisor', key: 'fac', width: 28 },
        { header: 'Tasks Completed', key: 'tasks', width: 16 },
        { header: 'Score (%)', key: 'pct', width: 12 },
        { header: 'Grade', key: 'grade', width: 10 }
    ];
    styleHeader(sh1, 1);
    studentStats.forEach((s, i) => {
        const r = sh1.addRow({ ...s, grade: getLetterGrade(s.percentage) });
        r.height = 25;
        r.alignment = { vertical: 'middle' };
        if (i % 2 !== 0) r.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_BLUE });
        r.getCell('pct').font = { bold: true, color: s.percentage >= 50 ? { argb: 'FF059669' } : { argb: 'FFDC2626' } };
        r.getCell('grade').font = { bold: true, color: s.percentage >= 50 ? { argb: 'FF059669' } : { argb: 'FFDC2626' } };
        r.eachCell(c => c.border = BORDER);
    });

    // ── SHEET 2: SITE SUPERVISOR BREAKDOWN ────────────────────────────────
    const sh2 = workbook.addWorksheet('Site Supervisor Breakdown');
    sh2.columns = [
        { header: 'Site Supervisor', key: 'col1', width: 28 },
        { header: 'Registration #', key: 'col2', width: 24 },
        { header: 'Student Name', key: 'col3', width: 28 },
        { header: 'Company', key: 'col4', width: 28 },
        { header: 'Score (%)', key: 'col5', width: 12 },
        { header: 'Grade', key: 'col6', width: 10 }
    ];
    styleHeader(sh2, 1);
    let sh2Row = 1;
    Object.entries(supervisorStudents).forEach(([supName, studs]) => {
        // Supervisor header row
        sh2Row++;
        const hdr = sh2.addRow({ col1: supName, col2: `${studs.length} student(s)`, col3: '', col4: '', col5: `Avg: ${Math.round(studs.reduce((a, s) => a + s.percentage, 0) / studs.length)}%`, col6: '' });
        hdr.font = { bold: true, size: 11, color: NAVY };
        hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        hdr.height = 28;
        hdr.eachCell(c => c.border = BORDER);

        // Student rows under this supervisor
        studs.forEach((s, i) => {
            sh2Row++;
            const r = sh2.addRow({ col1: '', col2: s.reg, col3: s.name, col4: s.company, col5: `${s.percentage}%`, col6: getLetterGrade(s.percentage) });
            r.height = 22;
            r.alignment = { vertical: 'middle' };
            r.getCell('col6').font = { bold: true, color: s.percentage >= 50 ? { argb: 'FF059669' } : { argb: 'FFDC2626' } };
            if (i % 2 !== 0) r.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_BLUE });
            r.eachCell(c => c.border = BORDER);
        });

        // Blank separator
        sh2.addRow({});
        sh2Row++;
    });

    // ── SHEET 3: FACULTY SUPERVISOR BREAKDOWN ─────────────────────────────
    const sh3 = workbook.addWorksheet('Faculty Supervisor Breakdown');
    sh3.columns = [
        { header: 'Faculty Supervisor', key: 'col1', width: 28 },
        { header: 'Registration #', key: 'col2', width: 24 },
        { header: 'Student Name', key: 'col3', width: 28 },
        { header: 'Company', key: 'col4', width: 28 },
        { header: 'Score (%)', key: 'col5', width: 12 },
        { header: 'Grade', key: 'col6', width: 10 },
        { header: 'Tasks Done', key: 'col7', width: 12 }
    ];
    styleHeader(sh3, 1);
    Object.entries(facultyStudents).forEach(([facName, studs]) => {
        // Faculty header row
        const tasksTotal = studs.reduce((a, s) => a + (s.tasks || 0), 0);
        const hdr = sh3.addRow({ col1: facName, col2: `${studs.length} student(s)`, col3: '', col4: '', col5: `Avg: ${Math.round(studs.reduce((a, s) => a + s.percentage, 0) / studs.length)}%`, col6: '', col7: `${tasksTotal} tasks` });
        hdr.font = { bold: true, size: 11, color: NAVY };
        hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        hdr.height = 28;
        hdr.eachCell(c => c.border = BORDER);

        // Student rows under this faculty
        studs.forEach((s, i) => {
            const r = sh3.addRow({ col1: '', col2: s.reg, col3: s.name, col4: s.company, col5: `${s.percentage}%`, col6: getLetterGrade(s.percentage), col7: s.tasks || 0 });
            r.height = 22;
            r.alignment = { vertical: 'middle' };
            r.getCell('col6').font = { bold: true, color: s.percentage >= 50 ? { argb: 'FF059669' } : { argb: 'FFDC2626' } };
            if (i % 2 !== 0) r.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_BLUE });
            r.eachCell(c => c.border = BORDER);
        });

        // Blank separator
        sh3.addRow({});
    });

    // ── SHEET 4: COMPANY BREAKDOWN ────────────────────────────────────────
    const sh4 = workbook.addWorksheet('Company Breakdown');
    sh4.columns = [
        { header: 'Company Name', key: 'col1', width: 30 },
        { header: 'Site Supervisor', key: 'col2', width: 28 },
        { header: 'Registration #', key: 'col3', width: 24 },
        { header: 'Student Name', key: 'col4', width: 28 },
        { header: 'Faculty Supervisor', key: 'col5', width: 28 },
        { header: 'Score (%)', key: 'col6', width: 12 },
        { header: 'Grade', key: 'col7', width: 10 }
    ];
    styleHeader(sh4, 1);
    Object.entries(companyStudents).forEach(([coName, data]) => {
        // Company header row
        const studs = data.students;
        const hdr = sh4.addRow({ col1: coName, col2: `Supervisor: ${data.supervisor}`, col3: `${studs.length} student(s)`, col4: '', col5: '', col6: `Avg: ${Math.round(studs.reduce((a, s) => a + s.percentage, 0) / studs.length)}%`, col7: '' });
        hdr.font = { bold: true, size: 11, color: NAVY };
        hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        hdr.height = 28;
        hdr.eachCell(c => c.border = BORDER);

        // Student rows under this company
        studs.forEach((s, i) => {
            const r = sh4.addRow({ col1: '', col2: '', col3: s.reg, col4: s.name, col5: s.fac, col6: `${s.percentage}%`, col7: getLetterGrade(s.percentage) });
            r.height = 22;
            r.alignment = { vertical: 'middle' };
            r.getCell('col7').font = { bold: true, color: s.percentage >= 50 ? { argb: 'FF059669' } : { argb: 'FFDC2626' } };
            if (i % 2 !== 0) r.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT_BLUE });
            r.eachCell(c => c.border = BORDER);
        });

        // Blank separator
        sh4.addRow({});
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

/**
 * @swagger
 * /reports/hod-premium-stats:
 *   get:
 *     summary: Retrieve comprehensive HOD performance metrics following HEC standards
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
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
            company: ss.assignedCompany || assigned[0]?.company || 'N/A',
            students: assigned.length,
            evalsCompleted: graded,
            avgScoreGiven: assigned.length > 0 ? Math.round(assigned.reduce((a, b) => a + b.percentage, 0) / assigned.length) + '%' : 'N/A'
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

    // 8. Role Activity for exception reporting
    const roleActivity = {
        'Faculty Supervisor': {
            pending: allMarks.filter(m => !m.isFacultyGraded).length
        }
    };

    const allStudentsList = sorted.map(s => {
        let g = 'F';
        if (s.percentage >= 90) g = 'A+';
        else if (s.percentage >= 80) g = 'A';
        else if (s.percentage >= 70) g = 'B+';
        else if (s.percentage >= 60) g = 'B';
        else if (s.percentage >= 50) g = 'C';
        return {
            name: s.name,
            reg: s.reg,
            company: s.company,
            grade: g
        };
    });

    res.json({
        phases,
        compStats,
        roleStats,
        facultyPerformance,
        siteSupervisorPerformance,
        companyReports,
        gradeDist: Object.entries(grades).map(([g, c]) => ({ grade: g, count: c, pct: processedStudents.length > 0 ? ((c / processedStudents.length) * 100).toFixed(1) + '%' : '0%' })),
        roleActivity,
        buckets: { top, middle, bottom },
        allStudentsList,
        generatedAt: { date: getPKTDate(), time: getPKTTime() }
    });
}));

/**
 * @swagger
 * /reports/hod-premium-stats/{archiveId}:
 *   get:
 *     summary: Retrieve premium stats from an archived cycle in the same format as hod-premium-stats
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/hod-premium-stats/:archiveId', protect, asyncHandler(async (req, res) => {
    const archive = await Archive.findById(req.params.archiveId).lean();
    if (!archive) return res.status(404).json({ message: 'Archive not found' });

    const students = archive.students || [];

    // 1. Process Student Performance & Buckets (same shape as live endpoint)
    const processedStudents = students
        .filter(s => s.finalStatus !== 'Ineligible')
        .map(s => ({
            _id: s._id || s.reg,
            reg: s.reg,
            name: s.name,
            email: s.email || 'N/A',
            company: s.company || 'N/A',
            faculty: s.faculty?.name || 'N/A',
            siteSupervisor: s.siteSupervisor?.name || 'N/A',
            percentage: s.percentage || 0,
            status: s.status || s.finalStatus,
            assignmentsCount: (s.marks || []).length
        }));

    const sorted = [...processedStudents].sort((a, b) => b.percentage - a.percentage);
    const top = sorted.slice(0, 5);
    const bottom = [...sorted].reverse().slice(0, 5).filter(s => !top.some(t => t.reg === s.reg));
    const midIdx = Math.floor(sorted.length / 2);
    const middle = sorted.slice(Math.max(0, midIdx - 2), midIdx + 3).filter(s => !top.some(t => t.reg === s.reg) && !bottom.some(b => b.reg === s.reg));

    // 2. Completion Statistics
    const compStats = {
        total: students.length,
        completed: students.filter(s => s.finalStatus === 'Pass').length,
        inProgress: 0,
        overdue: 0,
        withdrawn: students.filter(s => s.status === 'Withdrawn').length
    };

    // 3. Phases from rawSnapshot
    const phases = (archive.rawSnapshot?.phases || []).map(p => ({
        _id: p._id || p.key,
        key: p.key || p.label?.toLowerCase().replace(/\s+/g, '_'),
        label: p.label,
        description: p.description || '',
        order: p.order,
        status: p.completedAt ? 'completed' : 'active',
        startedAt: p.startedAt,
        completedAt: p.completedAt
    }));

    // 4. Role Stats (from archive context, zeroed since we don't store audit logs)
    const roleStats = {
        'Site Supervisor': 0,
        'Faculty Supervisor': 0,
        'Internship Office': 0,
        'HOD': 0
    };

    // 5. Faculty Performance from archived student data
    const facultyMap = {};
    processedStudents.forEach(s => {
        const fname = s.faculty || 'Unassigned';
        if (!facultyMap[fname]) facultyMap[fname] = { name: fname, students: 0, gradedCount: 0, totalPct: 0 };
        facultyMap[fname].students++;
        facultyMap[fname].totalPct += s.percentage;
    });
    // Count graded tasks per faculty from student marks
    students.forEach(s => {
        const fname = s.faculty?.name || 'Unassigned';
        if (facultyMap[fname]) {
            facultyMap[fname].gradedCount += (s.marks || []).filter(m => m.isFacultyGraded).length;
        }
    });
    const facultyPerformance = Object.values(facultyMap).map(f => ({
        name: f.name,
        students: f.students,
        gradedCount: f.gradedCount,
        completionPct: f.students > 0 ? Math.round((f.gradedCount / Math.max(f.students, 1)) * 100) : 0,
        avgScoreGiven: f.students > 0 ? Math.round(f.totalPct / f.students) : 'N/A'
    })).sort((a, b) => b.students - a.students);

    // 6. Site Supervisor Performance from archived student data
    const ssMap = {};
    processedStudents.forEach(s => {
        const ssName = s.siteSupervisor || 'Unassigned';
        if (!ssMap[ssName]) ssMap[ssName] = { name: ssName, company: s.company, students: 0, evalsCompleted: 0, totalPct: 0 };
        ssMap[ssName].students++;
        ssMap[ssName].totalPct += s.percentage;
    });
    students.forEach(s => {
        const ssName = s.siteSupervisor?.name || 'Unassigned';
        if (ssMap[ssName]) {
            ssMap[ssName].evalsCompleted += (s.marks || []).filter(m => m.siteSupervisorMarks > 0).length;
        }
    });
    const siteSupervisorPerformance = Object.values(ssMap).map(ss => ({
        name: ss.name,
        company: ss.company,
        students: ss.students,
        evalsCompleted: ss.evalsCompleted,
        avgScoreGiven: ss.students > 0 ? Math.round(ss.totalPct / ss.students) + '%' : 'N/A'
    })).sort((a, b) => b.students - a.students);

    // 7. Company Participation Report
    const companyMap = {};
    processedStudents.forEach(s => {
        const c = s.company || 'Unassigned';
        if (!companyMap[c]) companyMap[c] = { name: c, interns: 0, supervisors: new Set(), totalPct: 0 };
        companyMap[c].interns++;
        companyMap[c].totalPct += s.percentage;
        if (s.siteSupervisor && s.siteSupervisor !== 'N/A') companyMap[c].supervisors.add(s.siteSupervisor);
    });
    const companyReports = Object.values(companyMap).map(c => ({
        name: c.name,
        interns: c.interns,
        supervisors: c.supervisors.size || 1,
        avgGrade: c.interns > 0 ? (c.totalPct / c.interns).toFixed(1) + '%' : 'N/A'
    }));

    // 8. Grade Distribution
    const grades = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0 };
    processedStudents.forEach(s => {
        if (s.percentage >= 90) grades['A+']++;
        else if (s.percentage >= 80) grades['A']++;
        else if (s.percentage >= 70) grades['B+']++;
        else if (s.percentage >= 60) grades['B']++;
        else if (s.percentage >= 50) grades['C']++;
        else grades['F']++;
    });

    // 9. Role Activity
    const roleActivity = {
        'Faculty Supervisor': {
            pending: 0
        }
    };

    // 10. All students list
    const allStudentsList = sorted.map(s => {
        let g = 'F';
        if (s.percentage >= 90) g = 'A+';
        else if (s.percentage >= 80) g = 'A';
        else if (s.percentage >= 70) g = 'B+';
        else if (s.percentage >= 60) g = 'B';
        else if (s.percentage >= 50) g = 'C';
        return { name: s.name, reg: s.reg, company: s.company, grade: g };
    });

    res.json({
        phases,
        compStats,
        roleStats,
        facultyPerformance,
        siteSupervisorPerformance,
        companyReports,
        gradeDist: Object.entries(grades).map(([g, c]) => ({ grade: g, count: c, pct: processedStudents.length > 0 ? ((c / processedStudents.length) * 100).toFixed(1) + '%' : '0%' })),
        roleActivity,
        buckets: { top, middle, bottom },
        allStudentsList,
        cycleName: archive.cycleName,
        generatedAt: { date: getPKTDate(), time: getPKTTime() }
    });
}));

/**
 * @swagger
 * /reports/archive-preview:
 *   get:
 *     summary: Get a real-time snapshot of the current cycle for archive validation
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/archive-preview', protect, asyncHandler(async (req, res) => {
    const snapshot = await getArchiveSnapshot();
    res.json(snapshot);
}));

export default router;
