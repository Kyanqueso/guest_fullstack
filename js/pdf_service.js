// Pinned to exact version to prevent supply-chain attacks via auto-updates
import { jsPDF } from 'https://esm.sh/jspdf@3.0.1'

export async function generateClientOrderPDF(imageUrl, dataPoints){
    //A4 landscape document measured in millimeters
    const doc = new jsPDF('landscape', 'mm', 'a4');

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
    const x = 10;
    const y = 20;
    const width = 120;
    const height = 120;

    doc.addImage(imgData, imageFormat, x, y, width, height);

    //Text position and spacing (in mm)
    let textX = 150;
    let textY = 30;
    const lineSpacing = 12;

    dataPoints.forEach((item) => {
        doc.setFontSize(11);

        doc.setFont('helvetica', 'bold');
        doc.text(item.label + ':', textX, textY);

        doc.setFont('helvetica', 'normal');
        doc.text(item.value, textX + 50, textY);

        textY += lineSpacing;
    });

    doc.save('order-summary.pdf'); //Trigger download

}

