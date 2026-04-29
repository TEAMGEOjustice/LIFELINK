import jsPDF from "jspdf";

export interface CertData {
  donorName: string;
  bloodGroup: string;
  certificateCode: string;
  issuedAt: string;
  donationNumber?: number;
  type?: "blood_donation" | "organ_pledge";
}

export function generateCertificatePDF(data: CertData): Blob {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // 1. Premium Dark Background
  doc.setFillColor(15, 15, 18);
  doc.rect(0, 0, w, h, "F");

  // 2. Sophisticated Borders
  // Outer gold border
  doc.setDrawColor(190, 155, 75); // Gold
  doc.setLineWidth(1.5);
  doc.rect(8, 8, w - 16, h - 16);
  
  // Inner thin red border
  doc.setDrawColor(220, 38, 38); // LifeLink Red
  doc.setLineWidth(0.3);
  doc.rect(11, 11, w - 22, h - 22);

  // 3. Header Section
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(42);
  doc.text("LIFELINK", w / 2, 45, { align: "center", charSpace: 3 });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(190, 155, 75);
  doc.text("EXCELLENCE IN HUMANITY", w / 2, 55, { align: "center", charSpace: 1 });

  // Decorative double line
  doc.setDrawColor(190, 155, 75);
  doc.setLineWidth(0.5);
  doc.line(w / 2 - 40, 62, w / 2 + 40, 62);
  doc.line(w / 2 - 30, 64, w / 2 + 30, 64);

  // 4. Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICATE OF APPRECIATION", w / 2, 80, { align: "center" });

  // 5. Body Text
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("This prestigious honor is proudly presented to", w / 2, 95, { align: "center" });

  // Recipient Name (Large & Elegant)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(34);
  doc.setFont("times", "bolditalic"); // Times for more formal feel
  doc.text(data.donorName.toUpperCase(), w / 2, 115, { align: "center" });

  // Reset font
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(12);

  const isOrgan = data.type === "organ_pledge";
  const bodyText = isOrgan 
    ? `For their noble pledge to donate life-saving organs through the LifeLink network. 
Your commitment to legacy and humanity ensures hope for those in critical need.`
    : `For their heroic contribution of blood (Group ${data.bloodGroup}) through the LifeLink network. 
Your selfless act has directly contributed to saving human life and serves as a beacon of hope for society.`;
  
  const splitText = doc.splitTextToSize(bodyText, w - 80);
  doc.text(splitText, w / 2, 130, { align: "center", lineHeightFactor: 1.5 });

  if (data.donationNumber && !isOrgan) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 155, 75);
    doc.text(`Official Milestone: Donation #${data.donationNumber}`, w / 2, 155, { align: "center" });
  } else if (isOrgan) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 155, 75);
    doc.text("Official Designation: Registered Organ Donor", w / 2, 155, { align: "center" });
  }

  // 6. Signature Section
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  
  // Left: Date
  doc.line(40, 185, 100, 185);
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10);
  doc.text("DATE OF ISSUE", 70, 192, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.text(new Date(data.issuedAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' }), 70, 182, { align: "center" });

  // Right: ID / Verification
  doc.line(w - 100, 185, w - 40, 185);
  doc.setTextColor(150, 150, 150);
  doc.text("CERTIFICATE ID", w - 70, 192, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.text(data.certificateCode, w - 70, 182, { align: "center" });

  // 7. Official Seal (Visual representation)
  doc.setDrawColor(190, 155, 75);
  doc.setLineWidth(1);
  doc.circle(w / 2, 185, 12, "D");
  doc.setFontSize(8);
  doc.setTextColor(190, 155, 75);
  doc.text("VERIFIED", w / 2, 184, { align: "center" });
  doc.text("LIFELINK", w / 2, 188, { align: "center" });

  // 8. Footer URL
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Verify this authentic document at: lifelink.connect/verify/${data.certificateCode}`, w / 2, h - 12, { align: "center" });

  return doc.output("blob");
}

export function downloadCertificate(data: CertData) {
  const blob = generateCertificatePDF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LifeLink-Certificate-${data.certificateCode}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
