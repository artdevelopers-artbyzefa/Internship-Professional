import express from 'express';
import PdfPrinter from 'pdfmake/js/Printer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPKTTime, getPKTDate } from '../utils/time.js';
import { protect } from '../middleware/auth.js';
import ExcelJS from 'exceljs';

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

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST api/reports/generate-pdf
// @desc    Generate a general faculty-list PDF (existing functionality)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/generate-pdf', protect, async (req, res) => {
    try {
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
                                text: cell,
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
                        paddingLeft: () => 5,
                        paddingRight: () => 5,
                        paddingTop: () => 6,
                        paddingBottom: () => 6,
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
        pdfDoc.on('error', (err) => {
            console.error('PDF Stream Error:', err);
            if (!res.headersSent) res.status(500).json({ message: 'Error streaming PDF' });
        });
        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ message: 'Error generating PDF report', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST api/reports/hod-full-report
// @desc    Generate the full HOD Institutional Performance Dossier (PDF)
//
// Student row structure (tables.students[]):
//  [0] = Registration #
//  [1] = Student Name
//  [2] = Academic Supervisor Name + "\n(Phone)"
//  [3] = Site Supervisor Name + "\n(Phone)"
//  [4] = Affiliated Company
//  [5] = Placement Mode (Standard (Physical) | Freelance)
//  [6] = Avg Marks (/10)
//  [7] = Percentage (%)
//  [8] = Grade
//  [9] = Final Status (Pass | Fail | Ineligible | Pending)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/hod-full-report', protect, async (req, res) => {
    try {
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

                // ═══════════════════════════════════════════════════════════
                // PAGE 1: COVER & PARTICIPATION ANATOMY
                // ═══════════════════════════════════════════════════════════

                // Header Banner
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

                // Section 01 — Participation Anatomy
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
                        paddingTop: () => 10,
                        paddingBottom: () => 10,
                        paddingLeft: () => 6,
                        paddingRight: () => 6,
                        fillColor: (i) => i === 0 ? '#eff6ff' : null
                    },
                    margin: [0, 0, 0, 22]
                },

                // Section 02 — Academic Performance Overview
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
                        paddingTop: () => 10,
                        paddingBottom: () => 10,
                        fillColor: (i) => i === 0 ? '#eff6ff' : null
                    },
                    margin: [0, 0, 0, 25]
                },

                // Section 03 — Charts
                { text: '03 — GRADE DISTRIBUTION & TREND ANALYSIS', style: 'sectionHeader', margin: [0, 0, 0, 12] },
                (charts.chartDist || charts.chartPie) ? {
                    columns: [
                        charts.chartDist ? { image: charts.chartDist, width: 265, height: 148 } : { text: '' },
                        charts.chartPie  ? { image: charts.chartPie,  width: 210, height: 148, margin: [10, 0, 0, 0] } : { text: '' }
                    ],
                    margin: [0, 0, 0, 15]
                } : {},
                (charts.chartTop || charts.chartFaculty) ? {
                    columns: [
                        charts.chartTop     ? { image: charts.chartTop,     width: 248, height: 165 } : { text: '' },
                        charts.chartFaculty ? { image: charts.chartFaculty, width: 248, height: 165, margin: [10, 0, 0, 0] } : { text: '' }
                    ],
                    margin: [0, 0, 0, 10]
                } : {},

                // ═══════════════════════════════════════════════════════════
                // PAGE 2: FACULTY MATRIX
                // ═══════════════════════════════════════════════════════════
                { text: '04 — FACULTY SUPERVISOR PERFORMANCE MATRIX', style: 'sectionHeader', margin: [0, 15, 0, 10], pageBreak: 'before' },
                { text: 'Lists all faculty supervisors, number of students under their supervision, and the cohort average score for their assigned students.', style: 'noteText', margin: [0, 0, 0, 10] },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 100, 100, 80],
                        body: [
                            [
                                { text: 'FACULTY SUPERVISOR NAME', style: 'tableHeader' },
                                { text: 'STUDENTS ASSIGNED', style: 'tableHeader' },
                                { text: 'COHORT AVG SCORE', style: 'tableHeader' },
                                { text: 'AVG GRADE', style: 'tableHeader' }
                            ],
                            ...(tables.faculty && tables.faculty.length > 0
                                ? tables.faculty.map((row, idx) => [
                                    { text: s(row[0]), style: 'tableCell', bold: true, fillColor: idx % 2 !== 0 ? '#f8fafc' : null },
                                    { text: s(row[1]), style: 'tableCell', alignment: 'center', fillColor: idx % 2 !== 0 ? '#f8fafc' : null },
                                    { text: s(row[2]), style: 'tableCell', alignment: 'center', bold: true, color: '#1e40af', fillColor: idx % 2 !== 0 ? '#f8fafc' : null },
                                    { text: s(row[3]), style: 'tableCell', alignment: 'center', bold: true, color: '#1e40af', fillColor: idx % 2 !== 0 ? '#f8fafc' : null }
                                ])
                                : [[{ text: 'No faculty data.', colSpan: 4, style: 'tableCell', alignment: 'center', italics: true }, {}, {}, {}]]
                            )
                        ]
                    },
                    layout: {
                        hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 1.5 : 0.5,
                        vLineWidth: () => 0,
                        hLineColor: (i) => i === 1 ? '#1e3a8a' : '#e2e8f0',
                        paddingTop: () => 9, paddingBottom: () => 9,
                        paddingLeft: () => 8, paddingRight: () => 8
                    },
                    margin: [0, 0, 0, 20]
                },

                // ═══════════════════════════════════════════════════════════
                // PAGE 3: FULL STUDENT REGISTRY
                // ═══════════════════════════════════════════════════════════
                { text: '05 — FULL STUDENT REGISTRY — INSTITUTIONAL GRADE LEDGER', style: 'sectionHeader', margin: [0, 15, 0, 8], pageBreak: 'before' },
                { text: 'Complete list of all students in the cohort. Academic supervisor and site supervisor columns include name and contact number where available.', style: 'noteText', margin: [0, 0, 0, 10] },
                {
                    table: {
                        headerRows: 1,
                        widths: [52, 78, 80, 68, 52, 38, 24, 22, 22, 35],
                        body: [
                            [
                                { text: 'REG. NO', style: 'tableHeader' },
                                { text: 'STUDENT NAME', style: 'tableHeader' },
                                { text: 'ACADEMIC SUPERVISOR\n(Name + Phone)', style: 'tableHeader' },
                                { text: 'SITE SUPERVISOR\n(Name + Phone)', style: 'tableHeader' },
                                { text: 'COMPANY', style: 'tableHeader' },
                                { text: 'MODE', style: 'tableHeader' },
                                { text: 'AVG\n(/10)', style: 'tableHeader' },
                                { text: '%', style: 'tableHeader' },
                                { text: 'GRD', style: 'tableHeader' },
                                { text: 'STATUS', style: 'tableHeader' }
                            ],
                            ...(tables.students && tables.students.length > 0
                                ? tables.students.map((row, idx) => {
                                    const bg = idx % 2 !== 0 ? '#f8fafc' : null;
                                    return [
                                        { text: s(row[0]), style: 'tableCell', fontSize: 6.2, bold: true, fillColor: bg },
                                        { text: s(row[1]), style: 'tableCell', bold: true, fillColor: bg },
                                        { text: s(row[2]), style: 'tableCell', fontSize: 6.2, fillColor: bg },
                                        { text: s(row[3]), style: 'tableCell', fontSize: 6.2, fillColor: bg },
                                        { text: s(row[4]), style: 'tableCell', fontSize: 6.5, fillColor: bg },
                                        { text: s(row[5]), style: 'tableCell', fontSize: 6, alignment: 'center', fillColor: bg },
                                        { text: s(row[6]), style: 'tableCell', alignment: 'center', bold: true, fillColor: bg },
                                        { text: s(row[7]), style: 'tableCell', alignment: 'center', bold: true, fillColor: bg },
                                        { text: s(row[8]), style: 'tableCell', alignment: 'center', bold: true, color: '#1e40af', fillColor: bg },
                                        { text: s(row[9]), style: 'tableCell', alignment: 'center', bold: true, color: statusColor(s(row[9])), fillColor: bg }
                                    ];
                                })
                                : [[{ text: 'No student data available.', colSpan: 10, style: 'tableCell', alignment: 'center', italics: true }, {},{},{},{},{},{},{},{},{}]]
                            )
                        ]
                    },
                    layout: {
                        hLineWidth: (i) => (i === 0 || i === 1) ? 2 : 0.3,
                        vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 0.5 : 0.2,
                        hLineColor: (i) => i === 1 ? '#1e3a8a' : '#e2e8f0',
                        vLineColor: () => '#e2e8f0',
                        paddingTop: () => 5, paddingBottom: () => 5,
                        paddingLeft: () => 4, paddingRight: () => 4
                    },
                    margin: [0, 0, 0, 20]
                },

                // ═══════════════════════════════════════════════════════════
                // PAGE 4+: SUPERVISOR-WISE ROSTER
                // ═══════════════════════════════════════════════════════════
                { text: '06 — SUPERVISOR-WISE STUDENT ROSTER', style: 'sectionHeader', margin: [0, 15, 0, 8], pageBreak: 'before' },
                { text: 'Students are grouped by their assigned Academic Supervisor. Each group shows Reg. #, Name, Company, Placement Mode, Percentage, Grade, and Final Status.', style: 'noteText', margin: [0, 0, 0, 15] },

                ...(() => {
                    if (!tables.students || tables.students.length === 0) {
                        return [{ text: 'No student data to group.', style: 'noteText' }];
                    }
                    const grouped = {};
                    tables.students.forEach(row => {
                        // Supervisor is row[2] which is "Name\n(Phone)"
                        const rawSup = s(row[2]);
                        const supName = rawSup.split('\n')[0].trim() || 'Unassigned';
                        if (!grouped[supName]) grouped[supName] = [];
                        grouped[supName].push(row);
                    });

                    return Object.entries(grouped).flatMap(([supervisor, students]) => [
                        // Supervisor heading banner
                        {
                            table: {
                                widths: ['*'],
                                body: [[{
                                    text: `SUPERVISOR:  ${supervisor.toUpperCase()}   ·   ${students.length} STUDENT(S) ASSIGNED`,
                                    bold: true, fontSize: 8.5, color: 'white',
                                    margin: [8, 0, 0, 0]
                                }]]
                            },
                            layout: {
                                hLineWidth: () => 0, vLineWidth: () => 0,
                                fillColor: () => '#1e3a8a',
                                paddingTop: () => 8, paddingBottom: () => 8
                            },
                            margin: [0, 12, 0, 4]
                        },
                        // Students table under this supervisor
                        {
                            table: {
                                headerRows: 1,
                                widths: [60, 110, 95, 48, 25, 20, 42],
                                body: [
                                    [
                                        { text: 'REG. #', style: 'tableHeader', fillColor: '#dbeafe', color: '#1e3a8a' },
                                        { text: 'STUDENT NAME', style: 'tableHeader', fillColor: '#dbeafe', color: '#1e3a8a' },
                                        { text: 'COMPANY', style: 'tableHeader', fillColor: '#dbeafe', color: '#1e3a8a' },
                                        { text: 'MODE', style: 'tableHeader', fillColor: '#dbeafe', color: '#1e3a8a' },
                                        { text: '%', style: 'tableHeader', fillColor: '#dbeafe', color: '#1e3a8a' },
                                        { text: 'GRD', style: 'tableHeader', fillColor: '#dbeafe', color: '#1e3a8a' },
                                        { text: 'STATUS', style: 'tableHeader', fillColor: '#dbeafe', color: '#1e3a8a' }
                                    ],
                                    ...students.map((row, idx) => {
                                        const bg = idx % 2 !== 0 ? '#f8fafc' : null;
                                        return [
                                            { text: s(row[0]), style: 'tableCell', fontSize: 6.5, bold: true, fillColor: bg },
                                            { text: s(row[1]), style: 'tableCell', bold: true, fillColor: bg },
                                            { text: s(row[4]), style: 'tableCell', fontSize: 7, fillColor: bg },
                                            { text: s(row[5]), style: 'tableCell', fontSize: 6.5, alignment: 'center', fillColor: bg },
                                            { text: s(row[7]), style: 'tableCell', alignment: 'center', bold: true, fillColor: bg },
                                            { text: s(row[8]), style: 'tableCell', alignment: 'center', bold: true, color: '#1e40af', fillColor: bg },
                                            { text: s(row[9]), style: 'tableCell', alignment: 'center', bold: true, color: statusColor(s(row[9])), fillColor: bg }
                                        ];
                                    })
                                ]
                            },
                            layout: {
                                hLineWidth: (i) => i === 1 ? 1.2 : 0.3,
                                vLineWidth: () => 0.2,
                                hLineColor: (i) => i === 1 ? '#3b82f6' : '#e2e8f0',
                                vLineColor: () => '#e2e8f0',
                                paddingTop: () => 5, paddingBottom: () => 5,
                                paddingLeft: () => 5, paddingRight: () => 5
                            },
                            margin: [0, 0, 0, 6]
                        }
                    ]);
                })()
            ],

            footer: (currentPage, pageCount) => ({
                columns: [
                    {
                        text: `CLASSIFICATION: RESTRICTED  ·  DIMS — COMSATS CUI Abbottabad  ·  Generated: ${getPKTDate()} ${getPKTTime()}`,
                        style: 'footerText', margin: [30, 18]
                    },
                    {
                        text: `PAGE ${currentPage} / ${pageCount}`,
                        style: 'footerText', alignment: 'right', margin: [30, 18]
                    }
                ]
            }),

            styles: {
                uniName:        { fontSize: 14, bold: true, color: '#1e3a8a' },
                campusName:     { fontSize: 8, bold: true, color: '#475569', margin: [0, 2, 0, 6] },
                reportTitle:    { fontSize: 13, bold: true, color: '#1e293b', margin: [0, 3, 0, 0] },
                reportTitle2:   { fontSize: 11, bold: true, color: '#1e40af', margin: [0, 2, 0, 4] },
                reportSubTitle: { fontSize: 7.5, bold: true, color: '#94a3b8' },
                sectionHeader:  { fontSize: 9.5, bold: true, color: '#1e3a8a', decoration: 'underline' },
                kpiLabel:       { fontSize: 6.5, bold: true, color: '#64748b', alignment: 'center' },
                kpiValue:       { fontSize: 22, bold: true, color: '#1e293b', alignment: 'center', margin: [0, 5, 0, 5] },
                noteText:       { fontSize: 7.5, italics: true, color: '#64748b' },
                tableHeader:    { fontSize: 7.5, bold: true, fillColor: '#1e3a8a', color: 'white', alignment: 'center', margin: [0, 3, 0, 3] },
                tableCell:      { fontSize: 7.5, margin: [0, 2, 0, 2], color: '#1e293b' },
                footerText:     { fontSize: 6.5, color: '#94a3b8', italics: true }
            },
            defaultStyle: { font: 'Roboto' }
        };

        const pdfDoc = await printer.createPdfKitDocument(docDefinition);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="HOD_Internship_Performance_Dossier.pdf"');
        pdfDoc.on('error', (err) => {
            console.error('PDF stream error:', err);
            if (!res.headersSent) res.status(500).end();
        });
        pdfDoc.pipe(res);
        pdfDoc.end();

    } catch (error) {
        console.error('HOD PDF Generation Error:', error);
        res.status(500).json({ message: 'PDF Generation Failed', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST api/reports/hod-excel-report
// @desc    Generate the full HOD Institutional Audit Excel workbook
// ─────────────────────────────────────────────────────────────────────────────
router.post('/hod-excel-report', protect, async (req, res) => {
    try {
        const { stats, tables } = req.body;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'DIMS — COMSATS CUI Abbottabad';
        workbook.created = new Date();

        const NAVY  = { argb: 'FF1E3A8A' };
        const WHITE = { argb: 'FFFFFFFF' };
        const GREEN = { argb: 'FF059669' };
        const RED   = { argb: 'FFDC2626' };
        const AMBER = { argb: 'FFD97706' };
        const LIGHT = { argb: 'FFF8FAFC' };

        const styleHeader = (ws, rowNum) => {
            const r = ws.getRow(rowNum);
            r.font = { bold: true, color: WHITE, size: 10 };
            r.fill = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
            r.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            r.height = 32;
        };

        const styleAltRow = (r, idx) => {
            if (idx % 2 !== 0) {
                r.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT };
                });
            }
        };

        // ── SHEET 1: Institutional Summary ─────────────────────────────────
        const sh1 = workbook.addWorksheet('Institutional Summary');
        sh1.columns = [{ key: 'metric', width: 42 }, { key: 'value', width: 25 }];

        sh1.addRow(['COMSATS UNIVERSITY ISLAMABAD — INTERNSHIP PROGRAMME AUDIT', '']);
        sh1.addRow([`Academic Cycle: ${new Date().getFullYear()}   |   Report Generated: ${getPKTDate()} ${getPKTTime()}`, '']);
        sh1.addRow([]);
        sh1.addRow(['METRIC', 'VALUE']);
        styleHeader(sh1, 4);

        const metrics = [
            ['Total Enrolled Students',                       stats.total          ?? 'N/A'],
            ['Participating Students (Graded)',                stats.participating  ?? 'N/A'],
            ['Ineligible / Not Started',                      stats.ineligible     ?? 'N/A'],
            ['Physical Internship Placements',                stats.physical       ?? 'N/A'],
            ['Freelance Internship Placements',               stats.freelance      ?? 'N/A'],
            ['Successfully Graduated (Pass)',                 stats.passed         ?? 'N/A'],
            ['Failed / Attrition',                           stats.failed         ?? 'N/A'],
            ['Success Rate (Participating)',                  `${Math.round(((stats.passed||0) / (stats.participating||1)) * 100)}%`],
            ['Cohort Average Score (%)',                      `${stats.avgPct ?? 0}%`],
            ['Calculated Average Grade',                      stats.avgGrade       ?? 'N/A'],
            ['Students Pending Evaluation',                   stats.pending        ?? 0],
            ['Number of Faculty Supervisors',                 stats.totalFaculty   ?? 'N/A']
        ];

        metrics.forEach(([metric, value], idx) => {
            const row = sh1.addRow([metric, value]);
            row.getCell(1).font = { bold: true, color: NAVY };
            row.getCell(2).alignment = { horizontal: 'center' };
            if (idx % 2 !== 0) {
                row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: LIGHT }; });
            }
        });

        sh1.getRow(1).font = { bold: true, size: 14, color: NAVY };
        sh1.getRow(2).font = { size: 9, italic: true, color: { argb: 'FF64748B' } };

        // ── SHEET 2: Full Student Registry ─────────────────────────────────
        const sh2 = workbook.addWorksheet('Student Achievement Register');
        sh2.columns = [
            { header: 'REGISTRATION #',           key: 'reg',     width: 20 },
            { header: 'STUDENT FULL NAME',         key: 'name',    width: 32 },
            { header: 'ACADEMIC SUPERVISOR',       key: 'faculty', width: 38 },
            { header: 'SITE SUPERVISOR',           key: 'site',    width: 38 },
            { header: 'AFFILIATED COMPANY',        key: 'company', width: 35 },
            { header: 'PLACEMENT MODE',            key: 'mode',    width: 22 },
            { header: 'AVG MARKS (/10)',           key: 'avg',     width: 16 },
            { header: 'PERCENTAGE (%)',            key: 'pct',     width: 16 },
            { header: 'GRADE',                     key: 'grade',   width: 12 },
            { header: 'FINAL STATUS',              key: 'status',  width: 18 }
        ];
        styleHeader(sh2, 1);

        (tables.students || []).forEach((row, idx) => {
            const r = sh2.addRow({
                reg:     row[0] ?? 'N/A',
                name:    row[1] ?? 'N/A',
                faculty: String(row[2] ?? 'N/A').replace(/\n/g, ' | '),
                site:    String(row[3] ?? 'N/A').replace(/\n/g, ' | '),
                company: row[4] ?? 'N/A',
                mode:    row[5] ?? 'N/A',
                avg:     row[6] ?? 'N/A',
                pct:     row[7] ?? 'N/A',
                grade:   row[8] ?? 'N/A',
                status:  row[9] ?? 'N/A'
            });
            styleAltRow(r, idx);

            r.getCell('reg').font = { bold: true };
            r.getCell('name').font = { bold: true };
            r.getCell('grade').font = { bold: true, color: NAVY };

            const sc = r.getCell('status');
            if (row[9] === 'Pass')      { sc.font = { color: GREEN, bold: true }; }
            else if (row[9] === 'Fail') { sc.font = { color: RED,   bold: true }; }
            else                        { sc.font = { color: { argb: 'FF64748B' }, italic: true }; }

            const mc = r.getCell('mode');
            if (row[5] === 'Freelance') { mc.font = { color: AMBER, bold: true }; }
            else                        { mc.font = { color: NAVY }; }
        });

        // ── SHEET 3: Faculty Performance ────────────────────────────────────
        const sh3 = workbook.addWorksheet('Faculty Performance');
        sh3.columns = [
            { header: 'FACULTY SUPERVISOR NAME',  key: 'name',     width: 38 },
            { header: 'STUDENTS ASSIGNED',        key: 'count',    width: 22 },
            { header: 'AVERAGE SCORE (%)',        key: 'avgPct',   width: 22 },
            { header: 'AVERAGE GRADE',            key: 'avgGrade', width: 20 }
        ];
        styleHeader(sh3, 1);

        (tables.faculty || []).forEach((row, idx) => {
            const r = sh3.addRow({
                name:     row[0] ?? 'N/A',
                count:    row[1] ?? 0,
                avgPct:   row[2] ?? '0%',
                avgGrade: row[3] ?? 'N/A'
            });
            styleAltRow(r, idx);
            r.getCell('name').font = { bold: true };
            r.getCell('avgGrade').font = { bold: true, color: NAVY };
            r.getCell('count').alignment = { horizontal: 'center' };
            r.getCell('avgPct').alignment = { horizontal: 'center' };
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="HOD_Internship_Audit.xlsx"');
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Excel Export Error:', err);
        res.status(500).json({ message: 'Excel Export Failed', error: err.message });
    }
});

export default router;
