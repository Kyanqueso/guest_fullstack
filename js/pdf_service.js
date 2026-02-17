// Pinned to exact version to prevent supply-chain attacks via auto-updates
import { jsPDF } from 'https://esm.sh/jspdf@3.0.1'

export async function generateClientOrderPDF(imageUrl, dataPoints){
    //A4 landscape document (measured in mm)
    const doc = new jsPDF('landscape', 'mm', 'a4');

    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(93, 28, 52);
    doc.text('Theresa Shoes', 148.5, 20, { align: 'center' });

    // Subheader
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.setTextColor(80, 80, 80);
    doc.text('Custom Shoe Order Preference', 148.5, 30, { align: 'center' });

    // Only allow image fetches from trusted domains to prevent SSRF attacks
    const allowedDomains = ['dohhnithtdwtwkfwccag.supabase.co', 'placehold.co'];
    const url = new URL(imageUrl);
    if (!allowedDomains.includes(url.hostname)) {
        console.error('Untrusted image domain:', url.hostname);
        return;
    }

    const response = await fetch(imageUrl); //Download image from SupaBase Url
    const blob = await response.blob(); //Converts url -> binary data

    const imgData = await new Promise((resolve) => {
        const reader = new FileReader(); //Reads file (blob) data
        reader.onload = () => resolve(reader.result); //return result after reading

        // Read the blob as a base64 data URL
        reader.readAsDataURL(blob);
    });

    const imageFormat = 'JPEG';
    const imageX = 10;
    const imageY = 40;
    const width = 120;
    const height = 120;

    //Add Shadow effect
    doc.setFillColor(0, 0, 0);
    doc.rect(imageX + 1.5, imageY + 1.5, width, height, 'F');

    doc.addImage(imgData, imageFormat, imageX, imageY, width, height);

    // Table position and settings (in mm)
    const tableX = 150;
    const tableY = 40;
    const labelColWidth = 50;
    const valueColWidth = 80;
    const rowHeight = 12;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);


    dataPoints.forEach((item, i) => {
        const rowY = tableY + (i * rowHeight);

        // Label cell
        doc.setFillColor(93, 28, 52); //CSS --color-primary: #5D1C34
        doc.rect(tableX, rowY, labelColWidth, rowHeight, 'FD');

        // Value cell
        doc.setFillColor(248, 248, 255); //Ghost White
        doc.rect(tableX + labelColWidth, rowY, valueColWidth, rowHeight, 'FD');

        // Label text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(item.label, tableX + 3, rowY + 8);

        // Value text
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(item.value, tableX + labelColWidth + 3, rowY + 8);
    });

    // Footer separator line
    const footerY = 170;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(10, footerY, 287, footerY);

    // Left side - instruction note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('This is a summary of your preferences.', 10, footerY + 8);
    doc.text('Please send this to our Viber for order confirmation.', 10, footerY + 14);

    // Right side - business contact
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('0922-597-8596', 287, footerY + 6, { align: 'right' });
    doc.text('Marikina City, Metro Manila', 287, footerY + 12, { align: 'right' });

    // Order date
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Order Date: ' + today, 148.5, footerY + 24, { align: 'center' });

    //Trigger download
    doc.save('order-summary.pdf');
}

