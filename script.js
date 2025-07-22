console.log("[WIDGET] v4.1 Starting");

const { PDFDocument, rgb, StandardFonts } = PDFLib;
const messageElement = document.getElementById('message');
const downloadPdfButton = document.getElementById('downloadPdfButton');
const recordInfoElement = document.getElementById('record-info');
let currentRecord = null;
let currentRecordId = null;

/**
 * Formats a date object to 'YYYY-MM-DD'.
 * @param {Date} date - The date object.
 * @returns {string} Formatted date string.
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    // Grist dates can be numbers (timestamp or Excel serial) or ISO strings.
    // Try to parse both. If it's a number, assume it's milliseconds if large,
    // or Excel serial if smaller. The grist-api often converts dates to numbers.
    let dateValue;
    if (typeof date === 'number') {
        // Grist dates are often Excel serial dates (days since 1900-01-01) or Unix timestamps (seconds or milliseconds).
        // A common heuristic for Excel serial dates: if it's a large integer, could be days.
        // If it's a timestamp, it's usually milliseconds since epoch.
        // Assuming grist-api converts to milliseconds timestamp here for simplicity,
        // but robust handling might need checking grist.GristType.Date behavior.
        dateValue = new Date(date); // Direct use for milliseconds timestamp
        if (date < 60000 && date > 0) { // Small numbers might indicate Excel serial dates (e.g., 40000 for 2009)
            // This is a rough heuristic. Grist's internal date representation can vary.
            // For true Excel serial: new Date(Date.UTC(1899, 11, 30) + date * 24 * 60 * 60 * 1000);
            // However, grist-api typically provides standard JS Date-compatible values.
        }
    } else if (typeof date === 'string') {
        dateValue = new Date(date);
    } else {
        return 'N/A';
    }

    if (isNaN(dateValue.getTime())) return 'Invalid Date';
    return dateValue.toISOString().split('T')[0];
}

/**
 * Generates and downloads the PDF report for the current event.
 */
async function generatePdfReport() {
    if (!currentRecord) {
        console.warn("[WIDGET] No record selected for PDF generation.");
        return;
    }

    console.log("[WIDGET] Attempting to generate PDF for record ID:", currentRecordId, "with data:", currentRecord);

    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const {
            $EventCode,
            $Name,
            $Sport,
            $Discipline,
            $DateStart,
            $DateEnd,
            $CITY,
            $VENUE,
            $LEVEL,
            $POOL_SIZE,
            $Organiser
        } = currentRecord;

        const startDateFormatted = formatDate($DateStart);
        const endDateFormatted = formatDate($DateEnd);

        let y = 750;
        const x = 50;
        const lineHeight = 20;

        page.drawText('Event Report', {
            x,
            y,
            font: boldFont,
            size: 24,
            color: rgb(0.17, 0.24, 0.31), // Dark blue-gray
        });
        y -= 40; // Space after title

        const addDetail = (label, value) => {
            page.drawText(`${label}: `, {
                x,
                y,
                font: boldFont,
                size: 12,
                color: rgb(0, 0, 0),
            });
            // Calculate text width to position value
            const labelWidth = boldFont.widthOfTextAtSize(`${label}: `, 12);
            page.drawText(String(value || 'N/A'), {
                x: x + labelWidth + 5, // Adjust X for value, adding a small gap
                y,
                font: font,
                size: 12,
                color: rgb(0, 0, 0),
            });
            y -= lineHeight;
        };

        addDetail('Event Code', $EventCode);
        addDetail('Name', $Name);
        addDetail('Sport', $Sport);
        addDetail('Discipline', $Discipline);
        addDetail('Start Date', startDateFormatted);
        addDetail('End Date', endDateFormatted);
        addDetail('CITY', $CITY);
        addDetail('VENUE', $VENUE);
        addDetail('LEVEL', $LEVEL);
        addDetail('POOL_SIZE', $POOL_SIZE);
        addDetail('Organiser', $Organiser);

        const pdfBytes = await pdfDoc.save();
        const filename = `Event_Report_${$EventCode || 'Unknown'}.pdf`;

        // Trigger download
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href); // Clean up the URL object

        console.log(`[WIDGET] PDF generated and downloaded: ${filename}`);

    } catch (error) {
        console.error("[WIDGET] Error generating PDF:", error);
        alert("Failed to generate PDF report. Check your browser's console for details.");
    }
}

// Grist API initialization
grist.ready({
    requiredAccess: 'full',
    onEdit: () => { console.log("[WIDGET] onEdit triggered. Widget is being configured."); },
    onRecord: (record, mappings) => {
        currentRecord = record;
        // The mappings object provides information about the linked columns,
        // including the record ID if 'id' is mapped.
        // Assuming 'id' is a default mapping or explicitly linked.
        currentRecordId = mappings && mappings.id ? (record && record.id) : null;

        console.log("[WIDGET] grist.onRecord triggered.");
        console.log("[WIDGET] Current record data:", currentRecord);
        console.log("[WIDGET] Current record ID (from record object, if available):", currentRecord ? currentRecord.id : 'N/A');
        console.log("[WIDGET] Mappings provided:", mappings);

        // Check if a valid record is selected (not empty object or null)
        if (currentRecord && Object.keys(currentRecord).length > 0) {
            messageElement.style.display = 'none';
            downloadPdfButton.style.display = 'block';
            recordInfoElement.textContent = `Selected Event: ${currentRecord.$Name || currentRecord.$EventCode || 'Unnamed Event'}`;
            downloadPdfButton.disabled = false; // Enable button
            console.log("[WIDGET] Event record detected. Button enabled.");
        } else {
            messageElement.style.display = 'block';
            downloadPdfButton.style.display = 'none';
            recordInfoElement.textContent = '';
            downloadPdfButton.disabled = true; // Disable button
            console.log("[WIDGET] No event record selected. Button disabled.");
        }
    }
});

downloadPdfButton.addEventListener('click', generatePdfReport);

console.log("[WIDGET] Grist API ready callback registered and event listener set up.");
