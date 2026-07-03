import { jsPDF } from "jspdf";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { AiNotes } from "@/types/ai-notes.types";
import type { Session } from "@/types/session.types";
import { getPatientFullName } from "@/utils/patient.utils";

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
  patientName: string;
  sessionDate: string;
  noteTitle?: string;
}

export interface AiNotesExportContent {
  metadata: AiNotesExportMetadata;
  summary?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

const formatSessionDate = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
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

export const hasExportableAiNotes = (aiNotes?: AiNotes) => {
  if (!aiNotes || aiNotes.status !== "completed") return false;

  return Boolean(
    aiNotes.summary?.trim() ||
      aiNotes.subjective?.trim() ||
      aiNotes.objective?.trim() ||
      aiNotes.assessment?.trim() ||
      aiNotes.plan?.trim(),
  );
};

export const buildAiNotesExportContent = (
  aiNotes: AiNotes,
  session: Session,
): AiNotesExportContent => ({
  metadata: {
    patientName: getPatientFullName(
      typeof session.patientId === "object" ? session.patientId : undefined,
    ),
    sessionDate: formatSessionDate(session.createdAt || session.startedAt),
    noteTitle: session.title?.trim() || undefined,
  },
  summary: aiNotes.summary,
  subjective: aiNotes.subjective,
  objective: aiNotes.objective,
  assessment: aiNotes.assessment,
  plan: aiNotes.plan,
});

const appendMetadataPlainText = (content: AiNotesExportContent) => {
  const lines = [
    `Patient Name: ${content.metadata.patientName}`,
    `Session Date: ${content.metadata.sessionDate}`,
  ];

  if (content.metadata.noteTitle) {
    lines.push(`AI Note Title: ${content.metadata.noteTitle}`);
  }

  return lines.join("\n");
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
  const lines = [appendMetadataPlainText(content), ""];

  appendSectionPlainText(lines, "AI Summary", content.summary);

  SOAP_EXPORT_SECTIONS.forEach((section) => {
    appendSectionPlainText(lines, section.label, content[section.key]);
  });

  return lines.join("\n").trim();
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderSectionHtml = (title: string, body?: string) => {
  let bodyHtml = '<p class="empty">No content available.</p>';

  if (body?.trim()) {
    if (isBulletContent(body)) {
      bodyHtml = `<ul>${parseContentLines(body)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("")}</ul>`;
    } else {
      bodyHtml = `<p>${escapeHtml(body.trim()).replace(/\n/g, "<br />")}</p>`;
    }
  }

  return `
    <section class="note-section">
      <h2>${escapeHtml(title)}</h2>
      ${bodyHtml}
    </section>
  `;
};

export const buildAiNotesPrintHtml = (content: AiNotesExportContent) => {
  const metadataRows = [
    `<div><strong>Patient Name:</strong> ${escapeHtml(content.metadata.patientName)}</div>`,
    `<div><strong>Session Date:</strong> ${escapeHtml(content.metadata.sessionDate)}</div>`,
  ];

  if (content.metadata.noteTitle) {
    metadataRows.push(
      `<div><strong>AI Note Title:</strong> ${escapeHtml(content.metadata.noteTitle)}</div>`,
    );
  }

  const soapSections = SOAP_EXPORT_SECTIONS.map((section) =>
    renderSectionHtml(section.label, content[section.key]),
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AI Notes</title>
    <style>
      body {
        font-family: Georgia, "Times New Roman", serif;
        color: #111827;
        margin: 32px;
        line-height: 1.6;
      }
      h1 {
        font-size: 24px;
        margin: 0 0 16px;
      }
      .metadata {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #d1d5db;
        font-size: 14px;
      }
      .metadata div {
        margin-bottom: 6px;
      }
      .note-section {
        margin-bottom: 24px;
        page-break-inside: avoid;
      }
      h2 {
        font-size: 18px;
        margin: 0 0 8px;
      }
      p, li {
        font-size: 14px;
        margin: 0 0 8px;
      }
      ul {
        margin: 0;
        padding-left: 20px;
      }
      .empty {
        color: #6b7280;
        font-style: italic;
      }
      @media print {
        body {
          margin: 0.75in;
        }
      }
    </style>
  </head>
  <body>
    <h1>AI Clinical Notes</h1>
    <div class="metadata">
      ${metadataRows.join("")}
    </div>
    ${renderSectionHtml("AI Summary", content.summary)}
    ${soapSections}
  </body>
</html>`;
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
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");

  if (!printWindow) {
    throw new Error("Unable to open the print window. Please allow pop-ups and try again.");
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

const addPdfSection = (
  doc: jsPDF,
  state: { y: number },
  margin: number,
  maxWidth: number,
  pageHeight: number,
  title: string,
  body?: string,
) => {
  const ensureSpace = (height: number) => {
    if (state.y + height > pageHeight - margin) {
      doc.addPage();
      state.y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const headingLines = doc.splitTextToSize(title, maxWidth);
  ensureSpace(headingLines.length * 6 + 4);
  doc.text(headingLines, margin, state.y);
  state.y += headingLines.length * 6 + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  if (!body?.trim()) {
    const emptyLines = doc.splitTextToSize("No content available.", maxWidth);
    ensureSpace(emptyLines.length * 5 + 6);
    doc.setTextColor(107, 114, 128);
    doc.text(emptyLines, margin, state.y);
    doc.setTextColor(17, 24, 39);
    state.y += emptyLines.length * 5 + 8;
    return;
  }

  const lines = isBulletContent(body)
    ? parseContentLines(body).map((line) => `• ${line}`)
    : body.trim().split("\n");

  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, maxWidth);
    ensureSpace(wrapped.length * 5 + 2);
    doc.text(wrapped, margin, state.y);
    state.y += wrapped.length * 5 + 2;
  });

  state.y += 6;
};

export const downloadAiNotesPdf = async (
  content: AiNotesExportContent,
  session: Session,
) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const state = { y: margin };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AI Clinical Notes", margin, state.y);
  state.y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const metadataLines = [
    `Patient Name: ${content.metadata.patientName}`,
    `Session Date: ${content.metadata.sessionDate}`,
  ];

  if (content.metadata.noteTitle) {
    metadataLines.push(`AI Note Title: ${content.metadata.noteTitle}`);
  }

  metadataLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, maxWidth);
    doc.text(wrapped, margin, state.y);
    state.y += wrapped.length * 5 + 2;
  });

  state.y += 4;
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, state.y, pageWidth - margin, state.y);
  state.y += 8;

  addPdfSection(doc, state, margin, maxWidth, pageHeight, "AI Summary", content.summary);

  SOAP_EXPORT_SECTIONS.forEach((section) => {
    addPdfSection(
      doc,
      state,
      margin,
      maxWidth,
      pageHeight,
      section.label,
      content[section.key],
    );
  });

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
  const metadataParagraphs = [
    new Paragraph({
      children: [
        new TextRun({ text: "Patient Name: ", bold: true }),
        new TextRun(content.metadata.patientName),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Session Date: ", bold: true }),
        new TextRun(content.metadata.sessionDate),
      ],
      spacing: { after: 80 },
    }),
  ];

  if (content.metadata.noteTitle) {
    metadataParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "AI Note Title: ", bold: true }),
          new TextRun(content.metadata.noteTitle),
        ],
        spacing: { after: 80 },
      }),
    );
  }

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("AI Clinical Notes")],
            spacing: { after: 200 },
          }),
          ...metadataParagraphs,
          new Paragraph({ spacing: { after: 200 } }),
          ...buildDocxSection("AI Summary", content.summary),
          ...SOAP_EXPORT_SECTIONS.flatMap((section) =>
            buildDocxSection(section.label, content[section.key]),
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, buildExportFilename(session, "docx"));
};
