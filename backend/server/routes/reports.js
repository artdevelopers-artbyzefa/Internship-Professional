import express from 'express';
import PdfPrinter from 'pdfmake/js/Printer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPKTTime, getPKTDate } from '../utils/time.js';
import { protect } from '../middleware/auth.js';

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

export default router;
