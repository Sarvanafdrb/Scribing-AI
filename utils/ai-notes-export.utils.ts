import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { AiNotes, AiNotesMedication } from "@/types/ai-notes.types";
import type { Patient } from "@/types/patient.types";
import type {
  Session,
  SessionOrganization,
  SessionUser,
  VisitType,
} from "@/types/session.types";
import { resolveUploadUrl } from "@/utils/media-url.utils";
import { getPatientAge, getPatientFullName } from "@/utils/patient.utils";
import { formatEditableMedicationPrice } from "@/utils/prescriptionPrice.utils";

export const PRESCRIPTION_SECTIONS = [
  {
    key: "complaint" as const,
    label: "Patient Issue / Complaint",
    sourceKey: "subjective" as const,
  },
  {
    key: "treatmentHistory" as const,
    label: "Treatment / Scan / Examination History",
    sourceKey: "objective" as const,
  },
  {
    key: "observation" as const,
    label: "Observation",
    sourceKey: "assessment" as const,
  },
  {
    key: "suggestedTreatment" as const,
    label: "Suggested Treatment & Schedule",
    sourceKey: "plan" as const,
  },
  {
    key: "remarks" as const,
    label: "Remarks",
    sourceKey: "remarks" as const,
  },
] as const;

export const SOAP_EXPORT_SECTIONS = [
  {
    key: "subjective" as const,
    label: "Subjective",
    description: "Patient-reported information",
  },
  {
    key: "objective" as const,
    label: "Objective",
    description: "Observable clinical findings",
  },
  {
    key: "assessment" as const,
    label: "Assessment",
    description: "Clinical impression",
  },
  {
    key: "plan" as const,
    label: "Plan",
    description: "Treatment and follow-up",
  },
];

export interface AiNotesExportMetadata {
  organizationName: string;
  organizationLogo?: string;
  organizationAddress?: string;
  organizationContact?: string;
  patientName: string;
  patientPhone?: string;
  patientGender?: string;
  patientAge?: string;
  doctorName: string;
  doctorEducation?: string;
  doctorSignature?: string;
  visitType: VisitType;
  documentDate: string;
  admittedDate?: string;
  noteTitle?: string;
}

export interface AiNotesExportContent {
  metadata: AiNotesExportMetadata;
  complaint?: string;
  treatmentHistory?: string;
  observation?: string;
  suggestedTreatment?: string;
  remarks?: string;
  medications: AiNotesMedication[];
  summary?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

const formatDisplayDate = (value?: string | Date) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatGender = (gender?: string) => {
  if (!gender) return "—";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

const getDoctorName = (doctor?: SessionUser | string) => {
  if (!doctor || typeof doctor === "string") return "—";
  return `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() || "—";
};

const getOrganization = (session: Session): SessionOrganization | undefined => {
  if (typeof session.organizationId === "object") {
    return session.organizationId;
  }
  return undefined;
};

const getDoctor = (session: Session): SessionUser | undefined => {
  if (typeof session.userId === "object") {
    return session.userId;
  }
  return undefined;
};

const getPatient = (session: Session): Patient | undefined => {
  if (typeof session.patientId === "object") {
    return session.patientId;
  }
  return undefined;
};

const resolveDocumentDate = (session: Session) => {
  const visitType = session.visitType || "outpatient";
  if (visitType === "inpatient" && session.admittedDate) {
    return formatDisplayDate(session.admittedDate);
  }
  return formatDisplayDate(new Date());
};

export const buildAiNotesExportContent = (
  aiNotes: AiNotes,
  session: Session,
): AiNotesExportContent => {
  const organization = getOrganization(session);
  const doctor = getDoctor(session);
  const patient = getPatient(session);
  const visitType = session.visitType || "outpatient";
  const patientAge = patient ? getPatientAge(patient) : null;

  return {
    metadata: {
      organizationName: organization?.name || "—",
      organizationLogo: resolveUploadUrl(organization?.logo),
      organizationAddress: organization?.address || "—",
      organizationContact: organization?.contactNumber || "—",
      patientName: getPatientFullName(patient),
      patientPhone: patient?.phoneNumber || "—",
      patientGender: formatGender(patient?.gender),
      patientAge: patientAge !== null ? String(patientAge) : "—",
      doctorName: getDoctorName(doctor),
      doctorEducation: doctor?.qualification || "—",
      doctorSignature: doctor?.signature
        ? resolveUploadUrl(doctor.signature)
        : undefined,
      visitType,
      documentDate: resolveDocumentDate(session),
      admittedDate:
        visitType === "inpatient" && session.admittedDate
          ? formatDisplayDate(session.admittedDate)
          : undefined,
      noteTitle: session.title?.trim() || undefined,
    },
    complaint: aiNotes.subjective,
    treatmentHistory: aiNotes.objective,
    observation: aiNotes.assessment,
    suggestedTreatment: aiNotes.plan,
    remarks: aiNotes.remarks || aiNotes.summary,
    medications: aiNotes.medications || [],
    summary: aiNotes.summary,
    subjective: aiNotes.subjective,
    objective: aiNotes.objective,
    assessment: aiNotes.assessment,
    plan: aiNotes.plan,
  };
};

export type AiNotesExportUpdateOptions = {
  /** When true, SOAP fields are saved without touching medications (Phase B save rules unchanged). */
  omitMedications?: boolean;
};

/** Prefer in-progress preview edits over persisted export content for consultation completion. */
export const resolveCompletionExportContent = (
  savedContent: AiNotesExportContent | null | undefined,
  previewEditingContent: AiNotesExportContent | null | undefined,
): AiNotesExportContent | null =>
  previewEditingContent ?? savedContent ?? null;

export const exportContentToAiNotesUpdate = (
  content: AiNotesExportContent,
  options?: AiNotesExportUpdateOptions,
): Pick<
  AiNotes,
  | "subjective"
  | "objective"
  | "assessment"
  | "plan"
  | "remarks"
  | "medications"
  | "summary"
> => {
  const base = {
    subjective: content.complaint,
    objective: content.treatmentHistory,
    assessment: content.observation,
    plan: content.suggestedTreatment,
    remarks: content.remarks,
    summary: content.summary,
  };

  if (options?.omitMedications) {
    return base;
  }

  return {
    ...base,
    medications: content.medications
      .filter((medication) => medication.medicine.trim())
      .map((medication) => {
        const {
          catalogCostPreview: _preview,
          brandNameSnapshot: _brand,
          formSnapshot: _form,
          ...withoutPreview
        } = medication;
        if (!withoutPreview.medicineId) {
          return withoutPreview;
        }
        const { priceAtPrescription: _ignored, ...catalogMedication } =
          withoutPreview;
        return catalogMedication;
      }),
  };
};

export const hasExportableAiNotes = (aiNotes?: AiNotes) => {
  if (!aiNotes || aiNotes.status !== "completed") return false;

  return Boolean(
    aiNotes.summary?.trim() ||
    aiNotes.subjective?.trim() ||
    aiNotes.objective?.trim() ||
    aiNotes.assessment?.trim() ||
    aiNotes.plan?.trim() ||
    aiNotes.remarks?.trim() ||
    aiNotes.medications?.length,
  );
};

const parseContentLines = (content?: string) => {
  if (!content?.trim()) return [];

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-+\s*/, ""));
};

const isBulletContent = (content?: string) => {
  const lines =
    content
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean) ?? [];

  return lines.length > 0 && lines.every((line) => line.startsWith("-"));
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const PRESCRIPTION_DOCUMENT_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    color: #111827;
    margin: 0;
    padding: 24px;
    line-height: 1.5;
    background: #fff;
  }
  .prescription-page {
    max-width: 210mm;
    margin: 0 auto;
    min-height: 277mm;
    position: relative;
    padding-bottom: 120px;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 2px solid #1f2937;
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .logo {
    width: 90px;
    flex-shrink: 0;
  }
  .logo img {
    width: 90px;
    height: 90px;
    object-fit: contain;
    display: block;
  }
  .logo-placeholder {
    width: 90px;
    height: 90px;
    border: 1px dashed #d1d5db;
    border-radius: 8px;
  }
  .hospital {
    flex: 1;
    text-align: center;
  }
  .hospital h2 {
    margin: 0 0 4px;
    font-size: 24px;
    font-weight: 700;
  }
  .hospital p {
    margin: 2px 0;
    font-size: 13px;
    color: #374151;
  }
  .divider {
    border: 0;
    border-top: 1px solid #d1d5db;
    margin: 16px 0;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 24px;
    font-size: 13px;
    margin-bottom: 8px;
  }
  .info-grid .row {
    display: flex;
    gap: 6px;
  }
  .info-grid .label {
    font-weight: 600;
    white-space: nowrap;
  }
  .info-grid .value {
    flex: 1;
  }
  .note-section {
    margin-bottom: 18px;
    page-break-inside: avoid;
  }
  .note-section h3 {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
  }
  .note-section p,
  .note-section li {
    font-size: 13px;
    margin: 0 0 6px;
  }
  .note-section ul {
    margin: 0;
    padding-left: 18px;
  }
  .empty {
    color: #6b7280;
    font-style: italic;
  }
  .medication-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-top: 8px;
  }
  .medication-table th,
  .medication-table td {
    border: 1px solid #374151;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  .medication-table th {
    background: #f3f4f6;
    font-weight: 700;
  }
  .signature-block {
    position: absolute;
    right: 24px;
    bottom: 24px;
    text-align: center;
    min-width: 180px;
  }
  .signature-block img {
    max-width: 140px;
    max-height: 60px;
    object-fit: contain;
    display: block;
    margin: 0 auto 8px;
  }
  .signature-block .doctor-name {
    font-weight: 700;
    font-size: 14px;
    margin: 0;
  }
  .signature-block .qualification {
    font-size: 12px;
    margin: 2px 0 0;
    color: #374151;
  }
  .signature-block .authorised {
    font-size: 11px;
    margin-top: 8px;
    color: #6b7280;
    font-style: italic;
  }
  @media print {
    body { padding: 0; margin: 0.6in; }
    .prescription-page { max-width: none; min-height: auto; }
  }
`;

const renderSectionBodyHtml = (body?: string) => {
  if (!body?.trim()) {
    return '<p class="empty">No content available.</p>';
  }

  if (isBulletContent(body)) {
    return `<ul>${parseContentLines(body)
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("")}</ul>`;
  }

  return `<p>${escapeHtml(body.trim()).replace(/\n/g, "<br />")}</p>`;
};

const renderMedicationTableHtml = (medications: AiNotesMedication[]) => {
  if (!medications.length) {
    return '<p class="empty">No medications added yet. Use Manual Edit to search conditions and add medicines.</p>';
  }

  const rows = medications
    .map(
      (med) => `
      <tr>
        <td>${escapeHtml(med.medicine || "—")}</td>
        <td>${escapeHtml(formatEditableMedicationPrice(med))}</td>
        <td>${escapeHtml(med.morning || "—")}</td>
        <td>${escapeHtml(med.afternoon || "—")}</td>
        <td>${escapeHtml(med.night || "—")}</td>
        <td>${escapeHtml(med.days || "—")}</td>
        <td>${escapeHtml(med.instructions || "—")}</td>
      </tr>
    `,
    )
    .join("");

  return `
    <table class="medication-table">
      <thead>
        <tr>
          <th>Medicine</th>
          <th>Price</th>
          <th>Morning</th>
          <th>Afternoon</th>
          <th>Night</th>
          <th>Days</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const renderSignatureHtml = (metadata: AiNotesExportMetadata) => {
  if (!metadata.doctorSignature) return "";

  return `
    <div class="signature-block">
      <img src="${escapeHtml(metadata.doctorSignature)}" alt="Digital Signature" />
      <p class="doctor-name">Dr. ${escapeHtml(metadata.doctorName.replace(/^Dr\.?\s*/i, ""))}</p>
      ${
        metadata.doctorEducation && metadata.doctorEducation !== "—"
          ? `<p class="qualification">${escapeHtml(metadata.doctorEducation)}</p>`
          : ""
      }
      <p class="authorised">Authorised Signatory</p>
    </div>
  `;
};

export const buildAiNotesPrescriptionBodyHtml = (
  content: AiNotesExportContent,
) => {
  const { metadata } = content;
  const logoHtml = metadata.organizationLogo
    ? `<img src="${escapeHtml(metadata.organizationLogo)}" alt="Organization Logo" />`
    : '<div class="logo-placeholder"></div>';

  const admittedDateRow =
    metadata.visitType === "inpatient" && metadata.admittedDate
      ? `<div class="row"><span class="label">Admitted Date :</span><span class="value">${escapeHtml(metadata.admittedDate)}</span></div>`
      : "";

  const clinicalSections = PRESCRIPTION_SECTIONS.map(
    (section) => `
      <section class="note-section">
        <h3>${escapeHtml(section.label)}</h3>
        ${renderSectionBodyHtml(content[section.key])}
      </section>
    `,
  ).join("");

  return `
    <div class="prescription-page">
      <header class="header">
        <div class="logo">${logoHtml}</div>
        <div class="hospital">
          <h2>${escapeHtml(metadata.organizationName)}</h2>
          <p>${escapeHtml(metadata.organizationAddress || "")}</p>
          <p>Phone : ${escapeHtml(metadata.organizationContact || "")}</p>
        </div>
      </header>

      <hr class="divider" />

      <div class="info-grid">
        <div class="row">
          <span class="label">Patient Name :</span>
          <span class="value">${escapeHtml(metadata.patientName)}</span>
        </div>
        <div class="row">
          <span class="label">Doctor Name :</span>
          <span class="value">${escapeHtml(metadata.doctorName)}</span>
        </div>
        <div class="row">
          <span class="label">Date :</span>
          <span class="value">${escapeHtml(metadata.documentDate)}</span>
        </div>
        <div class="row">
          <span class="label">Doctor Education :</span>
          <span class="value">${escapeHtml(metadata.doctorEducation || "—")}</span>
        </div>
        ${admittedDateRow}
        <div class="row">
          <span class="label">Phone :</span>
          <span class="value">${escapeHtml(metadata.patientPhone || "—")}</span>
        </div>
        <div class="row">
          <span class="label">Gender :</span>
          <span class="value">${escapeHtml(metadata.patientGender || "—")}</span>
        </div>
        <div class="row">
          <span class="label">Age :</span>
          <span class="value">${escapeHtml(metadata.patientAge || "—")}</span>
        </div>
      </div>

      <hr class="divider" />

      ${clinicalSections}

      <section class="note-section">
        <h3>Medications</h3>
        ${renderMedicationTableHtml(content.medications)}
      </section>

      ${renderSignatureHtml(metadata)}
    </div>
  `;
};

export const buildAiNotesPrintHtml = (content: AiNotesExportContent) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AI Notes Prescription</title>
    <style>${PRESCRIPTION_DOCUMENT_STYLES}</style>
  </head>
  <body>
    ${buildAiNotesPrescriptionBodyHtml(content)}
  </body>
</html>`;
};

const appendSectionPlainText = (
  lines: string[],
  title: string,
  body?: string,
) => {
  lines.push("", title);

  if (!body?.trim()) {
    lines.push("No content available.");
    return;
  }

  if (isBulletContent(body)) {
    parseContentLines(body).forEach((line) => {
      lines.push(`• ${line}`);
    });
    return;
  }

  lines.push(body.trim());
};

export const formatAiNotesPlainText = (content: AiNotesExportContent) => {
  const { metadata } = content;
  const lines = [
    metadata.organizationName,
    metadata.organizationAddress || "",
    `Phone: ${metadata.organizationContact || "—"}`,
    "",
    `Patient Name: ${metadata.patientName}`,
    `Doctor Name: ${metadata.doctorName}`,
    `Date: ${metadata.documentDate}`,
    `Doctor Education: ${metadata.doctorEducation || "—"}`,
  ];

  if (metadata.visitType === "inpatient" && metadata.admittedDate) {
    lines.push(`Admitted Date: ${metadata.admittedDate}`);
  }

  lines.push(
    `Phone: ${metadata.patientPhone || "—"}`,
    `Gender: ${metadata.patientGender || "—"}`,
    `Age: ${metadata.patientAge || "—"}`,
  );

  PRESCRIPTION_SECTIONS.forEach((section) => {
    appendSectionPlainText(lines, section.label, content[section.key]);
  });

  if (content.medications.length) {
    lines.push("", "Medications");
    content.medications.forEach((med, index) => {
      lines.push(
        `${index + 1}. ${med.medicine} | Price: ${formatEditableMedicationPrice(med)} | M:${med.morning || "-"} A:${med.afternoon || "-"} N:${med.night || "-"} | ${med.days || "-"} days | ${med.instructions || ""}`,
      );
    });
  }

  return lines.join("\n").trim();
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const buildExportFilename = (session: Session, extension: string) => {
  const code = session.sessionCode || session.id || session._id || "session";
  const date = new Date().toISOString().slice(0, 10);
  return `ai-notes-${code}-${date}.${extension}`;
};

export const copyAiNotesToClipboard = async (content: AiNotesExportContent) => {
  const text = formatAiNotesPlainText(content);
  await navigator.clipboard.writeText(text);
};

export const printAiNotes = (content: AiNotesExportContent) => {
  const printWindow = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=900,height=700",
  );

  if (!printWindow) {
    throw new Error(
      "Unable to open the print window. Please allow pop-ups and try again.",
    );
  }

  printWindow.document.open();
  printWindow.document.write(buildAiNotesPrintHtml(content));
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
};

const inlineContainerImages = async (root: HTMLElement) => {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;

      try {
        const response = await fetch(src, { credentials: "include" });
        if (!response.ok) {
          throw new Error("Image fetch failed");
        }

        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(blob);
        });

        img.src = dataUrl;
      } catch {
        img.style.display = "none";
      }
    }),
  );
};

const renderHtmlToPdf = async (html: string): Promise<jsPDF> => {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = [
    "position: fixed",
    "left: 0",
    "top: 0",
    "width: 794px",
    "height: 0",
    "opacity: 0",
    "pointer-events: none",
    "z-index: -9999",
    "border: 0",
  ].join(";");
  document.body.appendChild(iframe);

  const iframeDocument =
    iframe.contentDocument ?? iframe.contentWindow?.document ?? null;

  if (!iframeDocument) {
    document.body.removeChild(iframe);
    throw new Error("Unable to create PDF render frame.");
  }

  iframeDocument.open();
  iframeDocument.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>${PRESCRIPTION_DOCUMENT_STYLES}</style>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;color:#111827;">
    ${html}
  </body>
</html>`);
  iframeDocument.close();

  const renderRoot = iframeDocument.body;

  try {
    await inlineContainerImages(renderRoot);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const contentWidth = renderRoot.scrollWidth || 794;
    const contentHeight = renderRoot.scrollHeight;

    const canvas = await html2canvas(renderRoot, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      width: contentWidth,
      height: contentHeight,
      windowWidth: contentWidth,
      windowHeight: contentHeight,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pdfWidth - margin * 2;
    const pageContentHeight = pdfHeight - margin * 2;
    const imgHeight = (canvas.height * printableWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    let offsetY = 0;
    let page = 0;

    while (offsetY < imgHeight) {
      if (page > 0) {
        pdf.addPage();
      }

      pdf.addImage(
        imgData,
        "JPEG",
        margin,
        margin - offsetY,
        printableWidth,
        imgHeight,
      );

      offsetY += pageContentHeight;
      page += 1;
    }

    return pdf;
  } finally {
    document.body.removeChild(iframe);
  }
};

export const downloadAiNotesPdf = async (
  content: AiNotesExportContent,
  session: Session,
) => {
  const bodyHtml = buildAiNotesPrescriptionBodyHtml(content);
  const doc = await renderHtmlToPdf(bodyHtml);
  doc.save(buildExportFilename(session, "pdf"));
};

const buildDocxSection = (title: string, body?: string) => {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: title, bold: true })],
      spacing: { before: 240, after: 120 },
    }),
  ];

  if (!body?.trim()) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "No content available.",
            italics: true,
            color: "6B7280",
          }),
        ],
        spacing: { after: 200 },
      }),
    );
    return children;
  }

  if (isBulletContent(body)) {
    parseContentLines(body).forEach((line) => {
      children.push(
        new Paragraph({
          text: line,
          bullet: { level: 0 },
          spacing: { after: 80 },
        }),
      );
    });
    children.push(new Paragraph({ spacing: { after: 120 } }));
    return children;
  }

  body
    .trim()
    .split("\n")
    .filter(Boolean)
    .forEach((paragraph) => {
      children.push(
        new Paragraph({
          children: [new TextRun(paragraph)],
          spacing: { after: 120 },
        }),
      );
    });

  return children;
};

export const downloadAiNotesDocx = async (
  content: AiNotesExportContent,
  session: Session,
) => {
  const { metadata } = content;
  const metadataParagraphs = [
    new Paragraph({
      children: [
        new TextRun({ text: metadata.organizationName, bold: true, size: 28 }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun(metadata.organizationAddress || "")],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun(`Phone: ${metadata.organizationContact || "—"}`)],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Patient Name: ", bold: true }),
        new TextRun(metadata.patientName),
        new TextRun({ text: "    Doctor Name: ", bold: true }),
        new TextRun(metadata.doctorName),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Date: ", bold: true }),
        new TextRun(metadata.documentDate),
        new TextRun({ text: "    Doctor Education: ", bold: true }),
        new TextRun(metadata.doctorEducation || "—"),
      ],
      spacing: { after: 80 },
    }),
  ];

  if (metadata.visitType === "inpatient" && metadata.admittedDate) {
    metadataParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Admitted Date: ", bold: true }),
          new TextRun(metadata.admittedDate),
        ],
        spacing: { after: 80 },
      }),
    );
  }

  metadataParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Phone: ", bold: true }),
        new TextRun(metadata.patientPhone || "—"),
        new TextRun({ text: "    Gender: ", bold: true }),
        new TextRun(metadata.patientGender || "—"),
        new TextRun({ text: "    Age: ", bold: true }),
        new TextRun(metadata.patientAge || "—"),
      ],
      spacing: { after: 200 },
    }),
  );

  const medicationRows =
    content.medications.length > 0
      ? [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  "Medicine",
                  "Price",
                  "Morning",
                  "Afternoon",
                  "Night",
                  "Days",
                  "Instructions",
                ].map(
                  (heading) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: heading, bold: true }),
                          ],
                        }),
                      ],
                    }),
                ),
              }),
              ...content.medications.map(
                (med) =>
                  new TableRow({
                    children: [
                      med.medicine,
                      formatEditableMedicationPrice(med),
                      med.morning || "—",
                      med.afternoon || "—",
                      med.night || "—",
                      med.days || "—",
                      med.instructions || "—",
                    ].map(
                      (value) =>
                        new TableCell({
                          children: [new Paragraph(String(value))],
                        }),
                    ),
                  }),
              ),
            ],
          }),
          new Paragraph({ spacing: { after: 200 } }),
        ]
      : [];

  const document = new Document({
    sections: [
      {
        children: [
          ...metadataParagraphs,
          ...PRESCRIPTION_SECTIONS.flatMap((section) =>
            buildDocxSection(section.label, content[section.key]),
          ),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Medications", bold: true })],
            spacing: { before: 240, after: 120 },
          }),
          ...medicationRows,
          ...(metadata.doctorSignature
            ? [
                new Paragraph({ spacing: { before: 400 } }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Dr. ${metadata.doctorName}`,
                      bold: true,
                    }),
                  ],
                  alignment: "right",
                }),
                new Paragraph({
                  children: [new TextRun(metadata.doctorEducation || "")],
                  alignment: "right",
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Authorised Signatory",
                      italics: true,
                    }),
                  ],
                  alignment: "right",
                }),
              ]
            : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, buildExportFilename(session, "docx"));
};

export const createEmptyMedication = (): AiNotesMedication => ({
  medicine: "",
  medicineId: undefined,
  medicineNameSnapshot: "",
  strengthSnapshot: "",
  priceAtPrescription: undefined,
  morning: "",
  afternoon: "",
  night: "",
  days: "",
  instructions: "",
});
