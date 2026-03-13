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

// Import printer class from default export of CommonJS module
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

router.post('/generate-pdf', protect, async (req, res) => {
    try {
        const {
            reportTitle = 'Student Report',
            supervisorName = 'Not Assigned',
            tableHeader = ['Reg. #', 'Name', 'Company', 'Status'],
            tableData = [],
            columnsLayout = ['auto', '*', '*', 'auto']
        } = req.body;

        // Path to the university logo
        const logoPath = path.join(__dirname, '../../public/cuilogo.png');
        let logoBase64 = null;
        if (fs.existsSync(logoPath)) {
            logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
        }

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [35, 30, 35, 30],
            content: [
                // Header: Logo and University Name
                {
                    columns: [
                        logoBase64 ? {
                            image: logoBase64,
                            width: 60,
                            margin: [0, 0, 0, 0]
                        } : { text: '', width: 60 },
                        {
                            stack: [
                                { text: 'COMSATS University Islamabad', style: 'uniName' },
                                { text: 'Abbottabad Campus', style: 'campusName' },
                                { text: reportTitle, style: 'reportTitle' },
                            ],
                            alignment: 'center',
                            margin: [-60, 0, 0, 0] // Offset logo width to truly center title
                        }
                    ],
                    margin: [0, 0, 0, 25]
                },

                // Info Rows: Supervisor, Subject etc.
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

                // Main Table Content
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
                        hLineWidth: (i, node) => 0.5,
                        vLineWidth: (i, node) => 0.5,
                        hLineColor: (i, node) => '#000000',
                        vLineColor: (i, node) => '#000000',
                        paddingLeft: (i) => 5,
                        paddingRight: (i) => 5,
                        paddingTop: (i) => 6,
                        paddingBottom: (i) => 6,
                    }
                },

                // Footer Metadata
                {
                    text: `Generated from DIMS Portal on: ${getPKTDate()} at ${getPKTTime()}`,
                    style: 'footer',
                    margin: [0, 30, 0, 0]
                }
            ],
            styles: {
                uniName: {
                    fontSize: 16,
                    bold: true,
                    color: '#000080',
                    margin: [0, 0, 0, 2]
                },
                campusName: {
                    fontSize: 15,
                    bold: true,
                    color: '#000080',
                    margin: [0, 0, 0, 8]
                },
                reportTitle: {
                    fontSize: 14,
                    bold: true,
                    color: '#000080',
                    decoration: 'underline',
                    margin: [0, 2, 0, 0]
                },
                infoLabel: {
                    fontSize: 10,
                    bold: true
                },
                infoValue: {
                    fontSize: 10,
                    bold: false
                },
                tableHeader: {
                    fontSize: 9,
                    bold: true,
                    fillColor: '#f2f2f2',
                    alignment: 'center'
                },
                tableCell: {
                    fontSize: 8,
                    margin: [0, 1, 0, 1]
                },
                footer: {
                    fontSize: 8,
                    italics: true,
                    color: '#666666'
                }
            },
            defaultStyle: {
                font: 'Roboto'
            }
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

router.post('/hod-full-report', protect, async (req, res) => {
    try {
        const { stats, charts, tables } = req.body;

        const logoPath = path.join(__dirname, '../../public/cuilogo.png');
        let logoBase64 = null;
        if (fs.existsSync(logoPath)) {
            logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
        }

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 50],
            background: function(currentPage, pageSize) {
                return {
                    canvas: [
                        {
                            type: 'rect',
                            x: 0, y: 0, w: pageSize.width, h: 5,
                            color: '#1e3a8a'
                        }
                    ]
                };
            },
            content: [
                // Header
                {
                    columns: [
                        logoBase64 ? { image: logoBase64, width: 70 } : { text: '', width: 70 },
                        {
                            stack: [
                                { text: 'COMSATS UNIVERSITY ISLAMABAD', style: 'uniName' },
                                { text: 'ABBOTTABAD CAMPUS', style: 'campusName' },
                                { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 300, y2: 5, lineWidth: 1, color: '#e2e8f0' }] },
                                { text: 'DEPARTMENTAL INTERNSHIP PERFORMANCE DOSSIER', style: 'reportTitle', margin: [0, 10, 0, 0] },
                            ],
                            alignment: 'center',
                            margin: [-70, 0, 0, 0]
                        }
                    ],
                    margin: [0, 0, 0, 30]
                },

                // Executive Summary Stats
                { 
                    table: {
                        widths: ['*'],
                        body: [[{ text: 'EXECUTIVE ANALYTICS SUMMARY', style: 'sectionHeader', border: [false, false, false, true], borderColor: ['','','','#1e3a8a'] }]]
                    },
                    margin: [0, 0, 0, 15]
                },
                {
                    columns: [
                        {
                            stack: [
                                { text: 'COHORT SIZE', style: 'statLabel' },
                                { text: stats.total.toString(), style: 'statValue' },
                                { text: 'Total Evaluated', style: 'statSub' }
                            ]
                        },
                        {
                            stack: [
                                { text: 'COMPLETION RATE', style: 'statLabel' },
                                { text: `${Math.round((stats.passed / (stats.total || 1)) * 100)}%`, style: 'statValue', color: '#10b981' },
                                { text: `${stats.passed} Passed Students`, style: 'statSub' }
                            ]
                        },
                        {
                            stack: [
                                { text: 'ATTRITION / FAIL', style: 'statLabel' },
                                { text: stats.failed.toString(), style: 'statValue', color: '#ef4444' },
                                { text: 'Requires Review', style: 'statSub' }
                            ]
                        },
                        {
                            stack: [
                                { text: 'ACADEMIC AVG', style: 'statLabel' },
                                { text: `${stats.avgPct}%`, style: 'statValue', color: '#6366f1' },
                                { text: `Target Grade: ${stats.avgGrade}`, style: 'statSub' }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 25]
                },

                // Charts Section
                { text: 'DATA VISUALIZATION & TRENDS', style: 'sectionHeader', margin: [0, 10, 0, 15] },
                {
                    columns: [
                        charts.chartDist ? { image: charts.chartDist, width: 250 } : {},
                        charts.chartPie ? { image: charts.chartPie, width: 200, margin: [20, 0, 0, 0] } : {}
                    ],
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        charts.chartTop ? { image: charts.chartTop, width: 240 } : {},
                        charts.chartFaculty ? { image: charts.chartFaculty, width: 240, margin: [10, 0, 0, 0] } : {}
                    ],
                    margin: [0, 0, 0, 30]
                },

                // Faculty Table
                { text: 'FACULTY SUPERVISOR PERFORMANCE MATRIX', style: 'sectionHeader', margin: [0, 15, 0, 10], pageBreak: 'before' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 80, 80, 80],
                        body: [
                            [
                                { text: 'SUPERVISOR NAME', style: 'tableHeader' }, 
                                { text: 'QUOTA', style: 'tableHeader' }, 
                                { text: 'AVG SCORE', style: 'tableHeader' }, 
                                { text: 'AVG GRADE', style: 'tableHeader' }
                            ],
                            ...tables.faculty.map(row => [
                                { text: row[0], style: 'tableCell', bold: true },
                                { text: row[1], style: 'tableCell', alignment: 'center' },
                                { text: row[2], style: 'tableCell', alignment: 'center', color: '#1e40af', bold: true },
                                { text: row[3], style: 'tableCell', alignment: 'center', color: '#1e40af', bold: true }
                            ])
                        ]
                    },
                    layout: {
                        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
                        vLineWidth: () => 0,
                        hLineColor: () => '#e2e8f0',
                        paddingTop: () => 8,
                        paddingBottom: () => 8,
                    }
                },

                // Full Student Logs
                { text: 'DETAILED STUDENT ACHIEVEMENT REGISTRY', style: 'sectionHeader', margin: [0, 30, 0, 10], pageBreak: 'before' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', '*', '*', '*', 35, 30, 30, 40],
                        body: [
                            ['REG. NO', 'STUDENT NAME', 'SUPERVISOR', 'PARTNER COMPANY', 'AVG', '%', 'GRD', 'STATUS'].map(t => ({ text: t, style: 'tableHeader' })),
                            ...tables.students.map(row => [
                                { text: row[0], style: 'tableCell', font: 'Courier', fontSize: 7 },
                                { text: row[1].toUpperCase(), style: 'tableCell', bold: true },
                                { text: row[2], style: 'tableCell', fontSize: 7, color: '#64748b' },
                                { text: row[3], style: 'tableCell', fontSize: 7 },
                                { text: row[4].split('/')[0], style: 'tableCell', alignment: 'center', bold: true },
                                { text: row[5], style: 'tableCell', alignment: 'center', bold: true },
                                { text: row[6], style: 'tableCell', alignment: 'center', color: '#1e3a8a', bold: true },
                                { text: row[7], style: 'tableCell', alignment: 'center', bold: true, color: row[7] === 'Pass' ? '#10b981' : '#ef4444' }
                            ])
                        ]
                    },
                    layout: {
                        fillColor: (i) => (i % 2 === 0 && i !== 0) ? '#f8fafc' : null,
                        hLineWidth: (i) => (i === 0) ? 1 : 0.5,
                        vLineWidth: () => 0,
                        hLineColor: (i) => (i === 0) ? '#1e3a8a' : '#f1f5f9',
                        paddingTop: () => 5,
                        paddingBottom: () => 5,
                    }
                },

                // Supervisor-wise Breakdown
                { text: 'GOVERNANCE: SUPERVISOR-WISE STUDENT ROSTER', style: 'sectionHeader', margin: [0, 30, 0, 10], pageBreak: 'before' },
                ...(() => {
                    const grouped = {};
                    tables.students.forEach(s => {
                        const supervisor = s[2] || 'Unassigned';
                        if (!grouped[supervisor]) grouped[supervisor] = [];
                        grouped[supervisor].push(s);
                    });
                    
                    return Object.entries(grouped).map(([supervisor, students]) => [
                        {
                            table: {
                                widths: ['*'],
                                body: [
                                    [{ text: supervisor.toUpperCase(), style: 'tableHeader', alignment: 'left', fillColor: '#1e3a8a', color: 'white' }]
                                ]
                            },
                            margin: [0, 15, 0, 5]
                        },
                        {
                            table: {
                                headerRows: 1,
                                widths: [70, '*', '*', 30, 30, 40],
                                body: [
                                    ['Reg. #', 'Student Name', 'Company', '%', 'Grd', 'Status'].map(t => ({ text: t, style: 'tableHeader', fillColor: '#f1f5f9', color: '#1e3a8a' })),
                                    ...students.map(s => [
                                        { text: s[0], style: 'tableCell' },
                                        { text: s[1], style: 'tableCell', bold: true },
                                        { text: s[3], style: 'tableCell' },
                                        { text: s[5], style: 'tableCell', alignment: 'center' },
                                        { text: s[6], style: 'tableCell', alignment: 'center' },
                                        { text: s[7], style: 'tableCell', alignment: 'center', color: s[7] === 'Pass' ? '#10b981' : '#ef4444', bold: true }
                                    ])
                                ]
                            },
                            layout: 'lightHorizontalLines'
                        }
                    ]).flat();
                })()
            ],
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        { text: `CONFIDENTIAL REPORT | Generated by DIMS System on ${getPKTDate()} ${getPKTTime()}`, style: 'footerText', margin: [40, 0] },
                        { text: `PAGE ${currentPage} OF ${pageCount}`, style: 'footerText', alignment: 'right', margin: [40, 0] }
                    ],
                    margin: [0, 20, 0, 0]
                };
            },
            styles: {
                uniName: { fontSize: 18, bold: true, color: '#1e3a8a', letterSpacing: 1 },
                campusName: { fontSize: 12, bold: true, color: '#64748b' },
                reportTitle: { fontSize: 13, bold: true, color: '#1e3a8a', letterSpacing: 1 },
                sectionHeader: { fontSize: 11, bold: true, color: '#1e3a8a', letterSpacing: 1.5, margin: [0, 5, 0, 5] },
                statLabel: { fontSize: 8, bold: true, color: '#94a3b8', letterSpacing: 1 },
                statValue: { fontSize: 20, bold: true, color: '#1e293b', margin: [0, 2, 0, 2] },
                statSub: { fontSize: 7, color: '#94a3b8', bold: true },
                tableHeader: { fontSize: 8, bold: true, fillColor: '#1e3a8a', color: 'white', alignment: 'center', margin: [0, 4, 0, 4] },
                tableCell: { fontSize: 8, margin: [0, 2, 0, 2], color: '#334155' },
                footerText: { fontSize: 7, color: '#94a3b8', bold: true }
            },
            defaultStyle: { font: 'Roboto' }
        };

        const pdfDoc = await printer.createPdfKitDocument(docDefinition);
        const safeFilename = `HOD_Full_Analysis_${getPKTDate().replace(/[^a-zA-Z0-9]/g, '_')}`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);

        pdfDoc.on('error', (err) => {
            console.error('PDF Stream Error:', err);
            if (!res.headersSent) res.status(500).json({ message: 'Error streaming PDF' });
        });

        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error('HOD Full PDF Generation Error:', error);
        res.status(500).json({ message: 'Error generating HOD full PDF', error: error.message });
    }
});

// @route   POST api/reports/hod-excel-report
router.post('/hod-excel-report', protect, async (req, res) => {
    try {
        const { stats, tables, facultyDetailed } = req.body;
        const workbook = new ExcelJS.Workbook();
        
        // 1. Summary Sheet
        const summarySheet = workbook.addWorksheet('Programme Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 25 },
            { header: 'Value', key: 'value', width: 20 }
        ];
        
        summarySheet.addRow({ metric: 'Total Students', value: stats.total });
        summarySheet.addRow({ metric: 'Passed', value: stats.passed });
        summarySheet.addRow({ metric: 'Failed', value: stats.failed });
        summarySheet.addRow({ metric: 'Cohort Average (%)', value: stats.avgPct });
        summarySheet.addRow({ metric: 'Average Grade', value: stats.avgGrade });
        summarySheet.addRow({ metric: 'Total Faculty', value: stats.totalFaculty });
        
        // Styling Summary
        summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

        // 2. Student Directory Sheet
        const studentSheet = workbook.addWorksheet('Student Grade Directory');
        studentSheet.columns = [
            { header: 'Reg. #', key: 'reg', width: 15 },
            { header: 'Student Name', key: 'name', width: 25 },
            { header: 'Faculty Supervisor', key: 'faculty', width: 25 },
            { header: 'Company', key: 'company', width: 25 },
            { header: 'Avg Marks (/10)', key: 'avg', width: 15 },
            { header: 'Percentage (%)', key: 'pct', width: 15 },
            { header: 'Grade', key: 'grade', width: 10 },
            { header: 'Status', key: 'status', width: 12 }
        ];
        
        tables.students.forEach(row => {
            studentSheet.addRow({
                reg: row[0],
                name: row[1],
                faculty: row[2],
                company: row[3],
                avg: row[4],
                pct: row[5],
                grade: row[6],
                status: row[7]
            });
        });
        
        studentSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        studentSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

        // 3. Faculty Workload Sheet
        const facultySheet = workbook.addWorksheet('Faculty Workload');
        facultySheet.columns = [
            { header: 'Faculty Name', key: 'name', width: 30 },
            { header: 'Students Assigned', key: 'count', width: 15 },
            { header: 'Avg Percentage', key: 'avgPct', width: 15 },
            { header: 'Avg Grade', key: 'avgGrade', width: 15 }
        ];
        
        tables.faculty.forEach(row => {
            facultySheet.addRow({
                name: row[0],
                count: row[1],
                avgPct: row[2],
                avgGrade: row[3]
            });
        });
        
        facultySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        facultySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=HOD_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Excel Export Error:', err);
        res.status(500).json({ message: 'Error generating Excel report' });
    }
});

export default router;
