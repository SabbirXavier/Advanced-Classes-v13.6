import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { brandingService } from '../services/brandingService';

export const generateReceiptPDF = async (ledger: any, studentName: string, studentEmail: string, studentPhone: string, studentGrade: string, studentSubjects: string[] = []) => {
  const doc = new jsPDF();
  const branding = await brandingService.getBranding();
  
  const invoiceNumber = `INV-${ledger.month.replace('-', '')}-${ledger.id.substring(0, 4).toUpperCase()}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background - Light Theme styling
  doc.setFillColor(252, 252, 253); // Very light grey background
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Load logo if available
  if (branding.logo) {
    try {
      // Very basic implementation: You'd ideally need a base64 or a loaded image.
      // Assuming logo is a URL, it might not render directly in jsPDF without converting to base64.
      // For this implementation, we will use it if it's base64 or ignore it with a try/catch
      doc.addImage(branding.logo, 'JPEG', 14, 15, 30, 30);
    } catch(e) {
      // ignore logo errors if not base64
    }
  }

  // Header Details (Right aligned)
  const entityName = branding.entityName || branding.title || 'Academy';
  doc.setFontSize(24);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont('helvetica', 'bold');
  doc.text(entityName, pageWidth - 14, 25, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'normal');
  doc.text(branding.contactAddress || 'HQ Address', pageWidth - 14, 32, { align: 'right' });
  
  const contacts = [];
  if (branding.contactEmail) contacts.push(branding.contactEmail);
  if (branding.contactPhone) contacts.push(branding.contactPhone);
  if (branding.whatsapp) contacts.push(`WA: ${branding.whatsapp}`);
  doc.text(contacts.join(' | '), pageWidth - 14, 38, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 50, pageWidth - 14, 50);

  // Invoice Title
  doc.setFontSize(28);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT', 14, 65);

  // Invoice Meta
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'normal');
  doc.text('Receipt No:', pageWidth - 70, 60);
  doc.text('Date:', pageWidth - 70, 66);
  doc.text('Status:', pageWidth - 70, 72);
  
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceNumber, pageWidth - 14, 60, { align: 'right' });
  doc.text(new Date().toLocaleDateString('en-IN'), pageWidth - 14, 66, { align: 'right' });
  
  const isPaid = ledger.balance === 0 || ['Paid', 'Clear', 'Success'].includes(ledger.status);
  doc.setTextColor(isPaid ? 34 : 220, isPaid ? 197 : 38, isPaid ? 94 : 38); // Green vs Red
  doc.text(isPaid ? 'PAID' : 'PENDING', pageWidth - 14, 72, { align: 'right' });

  // Billed To
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO', 14, 85);
  
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(14);
  doc.text(studentName, 14, 92);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Class/Grade: ${studentGrade}`, 14, 98);
  doc.text(`${studentEmail} | ${studentPhone}`, 14, 104);
  
  const monthName = new Date(`${ledger.month}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' });
  doc.text(`Fee Month: ${monthName}`, 14, 110);

  // Table
  const tableData = [
    ["General Fee (Base)", `Rs. ${ledger.totalFee || 0}`],
  ];

  if (studentSubjects && studentSubjects.length > 0) {
    tableData.push(["Enrolled Subjects:\n" + studentSubjects.join(', '), "-"]);
  }

  if ((ledger.discount || 0) > 0) {
    tableData.push(["Standard Discount", `- Rs. ${ledger.discount}`]);
  }
  if ((ledger.advancedDiscount || 0) > 0) {
    tableData.push(["Advanced Payment Discount", `- Rs. ${ledger.advancedDiscount}`]);
  }
  
  tableData.push(
    ["Total Payable", `Rs. ${ledger.finalPayable || 0}`],
    ["Amount Paid", `Rs. ${ledger.paidAmount || 0}`]
  );

  (doc as any).autoTable({
    startY: 120,
    head: [["Description", "Amount"]],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [241, 245, 249], // Slate-100
      textColor: [71, 85, 105], // Slate-600
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      textColor: [30, 41, 59], // Slate-800
      fontSize: 10,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    styles: {
      lineColor: [226, 232, 240], // Slate-200
      lineWidth: 0.1,
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Balance Due banner
  doc.setFillColor(isPaid ? 240 : 254, isPaid ? 253 : 226, isPaid ? 244 : 226);
  doc.rect(14, finalY, pageWidth - 28, 20, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(isPaid ? 21 : 153, isPaid ? 128 : 27, isPaid ? 61 : 27);
  doc.setFont('helvetica', 'bold');
  doc.text('BALANCE DUE', 20, finalY + 13);
  doc.text(`Rs. ${ledger.balance || 0}`, pageWidth - 20, finalY + 13, { align: 'right' });

  // Disclaimer & Promotional Footer
  const disclaimerText = "Disclaimer: This is a computer generated receipt and does not require a physical signature.";
  const promoText = branding.invoicePromoText || 'Thank you for choosing us!';
  
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'italic');
  doc.text(disclaimerText, pageWidth / 2, pageHeight - 30, { align: 'center' });
  doc.setFontSize(9);
  doc.text(promoText, pageWidth / 2, pageHeight - 20, { align: 'center' });

  doc.save(`Receipt_${invoiceNumber}.pdf`);
};
