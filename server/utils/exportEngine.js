import PdfPrinter from 'pdfmake/js/Printer.js';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getPKTTime, getPKTDate } from './time.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const printer = new (PdfPrinter.default || PdfPrinter)(fonts);

// 🎨 Helper for status colors
const statusColor = (st) => st === 'Pass' ? '#059669' : st === 'Fail' ? '#dc2626' : '#64748b';
const s = (v) => (v == null ? 'N/A' : String(v));

const getLogo = () => {
    const logoPath = path.join(__dirname, '../../public/cuilogo.png');
    return fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}` : null;
};

/**
 * Generates the Institutional PDF Dossier as a Buffer
 */
export const generatePdfBuffer = async (data) => {
    const { stats, charts, tables } = data;
    const logoBase64 = getLogo();
    const successRate = Math.round(((stats.passed || 0) / (stats.participating || 1)) * 100);

    const docDefinition = {
        pageSize: 'A4', pageMargins: [30, 45, 30, 55],
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
                            { text: 'ARCHIVED PERFORMANCE & AUDIT DOSSIER', style: 'reportTitle2' },
                            { text: `CYCLE ARCHIVE: ${getPKTDate()}   |   CLASSIFICATION: ARCHIVAL`, style: 'reportSubTitle' },
                        ], margin: [15, 0, 0, 0]
                    }
                ], margin: [0, 0, 0, 35]
            },
            { text: '01 — ARCHIVAL SUMMARY', style: 'sectionHeader', margin: [0, 0, 0, 10] },
            {
                table: {
                    widths: ['*', '*', '*', '*', '*'],
                    body: [
                        [{ text: 'TOTAL ENROLLED', style: 'kpiLabel' }, { text: 'PARTICIPATING', style: 'kpiLabel' }, { text: 'PHYSICAL', style: 'kpiLabel' }, { text: 'FREELANCE', style: 'kpiLabel' }, { text: 'INELIGIBLE', style: 'kpiLabel' }],
                        [{ text: s(stats.total), style: 'kpiValue' }, { text: s(stats.participating), style: 'kpiValue', color: '#1e3a8a' }, { text: s(stats.physical), style: 'kpiValue' }, { text: s(stats.freelance), style: 'kpiValue' }, { text: s(stats.ineligible), style: 'kpiValue', color: '#dc2626' }]
                    ]
                },
                layout: 'lightHorizontalLines',
                margin: [0, 0, 0, 25]
            },
            {
                table: {
                    headerRows: 1, widths: [48, 65, 55, 60, 60, 48, 22, 18, 18, 30],
                    body: [
                        [{ text: 'REG. NO', style: 'tableHeader' }, { text: 'NAME', style: 'tableHeader' }, { text: 'EMAIL', style: 'tableHeader' }, { text: 'ACAD SUP.', style: 'tableHeader' }, { text: 'SITE SUP.', style: 'tableHeader' }, { text: 'COMPANY', style: 'tableHeader' }, { text: 'MODE', style: 'tableHeader' }, { text: 'AVG', style: 'tableHeader' }, { text: '%', style: 'tableHeader' }, { text: 'STATUS', style: 'tableHeader' }],
                        ...tables.students.map((row, idx) => {
                            const bg = idx % 2 !== 0 ? '#f8fafc' : null;
                            return [
                                { text: s(row[0]), fontSize: 6, bold: true, fillColor: bg },
                                { text: s(row[1]), fontSize: 6, bold: true, fillColor: bg },
                                { text: s(row[3]), fontSize: 5, fillColor: bg },
                                { text: s(row[4]), fontSize: 5, fillColor: bg },
                                { text: s(row[5]), fontSize: 5, fillColor: bg },
                                { text: s(row[6]), fontSize: 5, fillColor: bg },
                                { text: s(row[7]), fontSize: 5, alignment: 'center', fillColor: bg },
                                { text: s(row[8]), fontSize: 6, alignment: 'center', bold: true, fillColor: bg },
                                { text: s(row[9]), fontSize: 6, alignment: 'center', bold: true, fillColor: bg },
                                { text: s(row[10]), fontSize: 6, alignment: 'center', bold: true, color: statusColor(s(row[10])), fillColor: bg }
                            ];
                        })
                    ]
                }, margin: [0, 10, 0, 0]
            }
        ],
        styles: {
            uniName: { fontSize: 13, bold: true, color: '#1e3a8a' },
            campusName: { fontSize: 7, bold: true, color: '#64748b' },
            reportTitle: { fontSize: 11, bold: true, color: '#1e293b' },
            reportTitle2: { fontSize: 10, bold: true, color: '#1e40af' },
            reportSubTitle: { fontSize: 7, bold: true, color: '#94a3b8' },
            sectionHeader: { fontSize: 9, bold: true, color: '#1e3a8a' },
            kpiLabel: { fontSize: 7, bold: true, color: '#94a3b8', alignment: 'center' },
            kpiValue: { fontSize: 18, bold: true, color: '#1e293b', alignment: 'center' },
            tableHeader: { fontSize: 7, bold: true, fillColor: '#1e3a8a', color: 'white', alignment: 'center' }
        },
        defaultStyle: { font: 'Roboto' }
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    return new Promise((resolve, reject) => {
        const chunks = [];
        pdfDoc.on('data', chunk => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
        pdfDoc.end();
    });
};

/**
 * Generates the Institutional Excel Workbook as a Buffer
 */
export const generateExcelBuffer = async (data) => {
    const { students } = data;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Archive Detailed Ledger');

    sheet.columns = [
        { header: 'REGISTRATION #', key: 'reg', width: 20 },
        { header: 'FULL NAME', key: 'name', width: 30 },
        { header: 'EMAIL', key: 'email', width: 30 },
        { header: 'PHONE', key: 'phone', width: 20 },
        { header: 'ACADEMIC SUPERVISOR', key: 'fac', width: 25 },
        { header: 'SITE SUPERVISOR', key: 'site', width: 25 },
        { header: 'COMPANY', key: 'company', width: 30 },
        { header: 'MODE', key: 'mode', width: 15 },
        { header: 'PERCENTAGE', key: 'pct', width: 12 },
        { header: 'GRADE', key: 'grade', width: 10 },
        { header: 'STATUS', key: 'status', width: 15 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    students.forEach(s => {
        sheet.addRow({
            reg: s.reg,
            name: s.name,
            email: s.email,
            phone: s.phone,
            fac: s.faculty?.name || 'N/A',
            site: s.siteSupervisor?.name || 'N/A',
            company: s.company,
            mode: s.mode,
            pct: s.percentage,
            grade: s.grade,
            status: s.finalStatus
        });
    });

    return await workbook.xlsx.writeBuffer();
};
