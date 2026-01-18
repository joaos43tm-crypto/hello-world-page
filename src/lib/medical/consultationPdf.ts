import { PDFDocument, StandardFonts } from "pdf-lib";

export type ConsultationPdfInput = {
  store: {
    store_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  tutor: {
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  pet: {
    name: string;
    breed?: string | null;
    allergies?: string | null;
  };
  consultation: {
    started_at: string;
    ended_at?: string | null;
    office_name?: string | null;
    notes?: string | null;
  };
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function wrapText(text: string, maxChars: number) {
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split("\n");
  const lines: string[] = [];

  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (candidate.length <= maxChars) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        // If a single word is too long, hard-break it.
        if (w.length > maxChars) {
          let i = 0;
          while (i < w.length) {
            lines.push(w.slice(i, i + maxChars));
            i += maxChars;
          }
          line = "";
        } else {
          line = w;
        }
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

export async function generateConsultationPdf(input: ConsultationPdfInput) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 48;
  let y = 800;
  const lineH = 14;

  const newPage = (title?: string) => {
    page = pdfDoc.addPage([595.28, 841.89]);
    y = 800;
    if (title) {
      drawText(title, { bold: true, size: 14 });
      y -= 4;
    }
  };

  const drawText = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const size = opts?.size ?? 12;
    const chosenFont = opts?.bold ? fontBold : font;
    page.drawText(text, { x: marginX, y, size, font: chosenFont });
    y -= lineH + (size - 12) * 0.2;
  };

  // Header
  const storeName = input.store.store_name?.trim() || "Consulta";
  drawText(storeName, { bold: true, size: 16 });

  const contactBits = [input.store.phone, input.store.email].filter(Boolean).join(" • ");
  if (contactBits) drawText(contactBits);
  if (input.store.address) drawText(input.store.address);

  y -= 8;
  drawText("RELATÓRIO DE ATENDIMENTO", { bold: true, size: 14 });
  y -= 4;

  // Patient
  drawText(`Cliente: ${input.tutor.name}`, { bold: true });
  const tutorContact = [input.tutor.phone, input.tutor.email].filter(Boolean).join(" • ");
  if (tutorContact) drawText(`Contato: ${tutorContact}`);

  drawText(`Pet: ${input.pet.name}`, { bold: true });
  if (input.pet.breed) drawText(`Raça: ${input.pet.breed}`);
  if (input.pet.allergies) drawText(`Alergias: ${input.pet.allergies}`);

  y -= 6;

  // Consultation metadata
  if (input.consultation.office_name) drawText(`Consultório: ${input.consultation.office_name}`);
  drawText(`Início: ${formatDateTime(input.consultation.started_at)}`);
  if (input.consultation.ended_at) {
    drawText(`Fim: ${formatDateTime(input.consultation.ended_at)}`);
  }

  y -= 8;
  drawText("Anotações", { bold: true });

  const notes = (input.consultation.notes ?? "").trim();
  const notesLines = notes ? wrapText(notes, 95) : ["(sem anotações)"]; // heuristic for Helvetica 12

  for (const line of notesLines) {
    if (y < 60) newPage("Anotações (continuação)");
    drawText(line);
  }

  const pdfBytes = await pdfDoc.save();
  const bytes = new Uint8Array(pdfBytes);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
