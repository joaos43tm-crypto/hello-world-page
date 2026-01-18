import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
  professional?: {
    name?: string | null;
    title?: string | null;
  };
  options?: {
    includeCoverPage?: boolean;
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

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const marginX = 42;
  const bottomMargin = 56;
  let page = pdfDoc.addPage(pageSize);
  let y = 806;

  // Compact layout to fit in a single page
  const baseFontSize = 10;
  const baseLineH = 12;

  const storeName = input.store.store_name?.trim() || "Nome do PetShop";

  const drawText = (
    text: string,
    opts?: { bold?: boolean; size?: number; x?: number; color?: ReturnType<typeof rgb> }
  ) => {
    const size = opts?.size ?? baseFontSize;
    const chosenFont = opts?.bold ? fontBold : font;
    page.drawText(text, {
      x: opts?.x ?? marginX,
      y,
      size,
      font: chosenFont,
      color: opts?.color,
    });
    y -= baseLineH + (size - baseFontSize) * 0.25;
  };

  const newPage = (title?: string) => {
    page = pdfDoc.addPage(pageSize);
    y = 800;
    if (title) {
      drawText(title, { bold: true, size: 14 });
      y -= 4;
    }
  };

  // Default: single page PDF (no cover). Cover only when explicitly enabled.
  const includeCoverPage = input.options?.includeCoverPage === true;

  if (includeCoverPage) {
    // --- Cover page (modelo semelhante à imagem)
    const { width: w, height: h } = page.getSize();
    const topBarH = 10;
    const bottomBarH = 10;

    // top/bottom bars
    page.drawRectangle({ x: 0, y: h - topBarH, width: w, height: topBarH, color: rgb(0.20, 0.75, 0.40) });
    page.drawRectangle({ x: 0, y: 0, width: w, height: bottomBarH, color: rgb(0.20, 0.75, 0.40) });

    // subtle border
    page.drawRectangle({
      x: 12,
      y: 12,
      width: w - 24,
      height: h - 24,
      borderColor: rgb(0.20, 0.75, 0.40),
      borderWidth: 2,
      opacity: 0.65,
    });

    // simple watermark paw-like shapes
    const watermark = () => {
      const baseColor = rgb(0.55, 0.60, 0.68);
      const paw = (cx: number, cy: number, s: number) => {
        // pad
        page.drawEllipse({ x: cx, y: cy, xScale: 26 * s, yScale: 22 * s, color: baseColor, opacity: 0.08 });
        // toes
        page.drawEllipse({ x: cx - 18 * s, y: cy + 26 * s, xScale: 10 * s, yScale: 14 * s, color: baseColor, opacity: 0.08 });
        page.drawEllipse({ x: cx, y: cy + 32 * s, xScale: 10 * s, yScale: 14 * s, color: baseColor, opacity: 0.08 });
        page.drawEllipse({ x: cx + 18 * s, y: cy + 26 * s, xScale: 10 * s, yScale: 14 * s, color: baseColor, opacity: 0.08 });
      };
      paw(w * 0.70, h * 0.62, 1.1);
      paw(w * 0.58, h * 0.48, 0.9);
      paw(w * 0.80, h * 0.42, 0.8);
    };
    watermark();

    // "logo" block + store name
    const logoX = marginX;
    const logoY = h - 140;
    page.drawRectangle({ x: logoX, y: logoY, width: 34, height: 34, color: rgb(0.20, 0.75, 0.40) });
    page.drawText("PC", {
      x: logoX + 8,
      y: logoY + 10,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // store name centered-ish as in sample
    const titleSize = 22;
    const titleWidth = fontBold.widthOfTextAtSize(storeName, titleSize);
    page.drawText(storeName, {
      x: Math.max(marginX + 44, (w - titleWidth) / 2),
      y: logoY + 10,
      size: titleSize,
      font: fontBold,
      color: rgb(0.05, 0.18, 0.32),
    });

    // footer professional
    const profName = (input.professional?.name ?? "").trim();
    const profTitle = (input.professional?.title ?? "").trim();
    const footerY = 110;

    if (profName) {
      const nSize = 12;
      const nW = fontBold.widthOfTextAtSize(profName, nSize);
      page.drawText(profName, {
        x: (w - nW) / 2,
        y: footerY,
        size: nSize,
        font: fontBold,
        color: rgb(0.05, 0.18, 0.32),
      });

      if (profTitle) {
        const tSize = 9;
        const tW = font.widthOfTextAtSize(profTitle, tSize);
        page.drawText(profTitle, {
          x: (w - tW) / 2,
          y: footerY - 14,
          size: tSize,
          font,
          color: rgb(0.15, 0.55, 0.75),
        });
      }
    }

    // Start the report on a new page
    newPage();
  }

  // --- Report content
  y = 806;

  // Header
  drawText(storeName, { bold: true, size: 14, color: rgb(0.05, 0.18, 0.32) });

  const contactBits = [input.store.phone, input.store.email].filter(Boolean).join(" • ");
  if (contactBits) drawText(contactBits, { size: 9 });
  if (input.store.address) drawText(input.store.address, { size: 9 });

  y -= 6;
  drawText("RELATÓRIO DE ATENDIMENTO", { bold: true, size: 12 });
  y -= 2;

  // Patient
  drawText(`Cliente: ${input.tutor.name}`, { bold: true, size: 10 });
  const tutorContact = [input.tutor.phone, input.tutor.email].filter(Boolean).join(" • ");
  if (tutorContact) drawText(`Contato: ${tutorContact}`, { size: 9 });

  drawText(`Pet: ${input.pet.name}`, { bold: true, size: 10 });
  if (input.pet.breed) drawText(`Raça: ${input.pet.breed}`, { size: 9 });
  if (input.pet.allergies) drawText(`Alergias: ${input.pet.allergies}`, { size: 9 });

  y -= 4;

  // Consultation metadata
  if (input.consultation.office_name)
    drawText(`Consultório: ${input.consultation.office_name}`, { size: 9 });
  drawText(`Início: ${formatDateTime(input.consultation.started_at)}`, { size: 9 });
  if (input.consultation.ended_at) {
    drawText(`Fim: ${formatDateTime(input.consultation.ended_at)}`, { size: 9 });
  }

  y -= 6;
  drawText("Anotações", { bold: true, size: 11 });

  const notes = (input.consultation.notes ?? "").trim();
  const rawLines = notes ? wrapText(notes, 115) : ["(sem anotações)"];

  // We must keep the PDF to 1 page: truncate if needed.
  const availableLines = Math.max(1, Math.floor((y - bottomMargin) / baseLineH));

  let linesToRender = rawLines;
  if (rawLines.length > availableLines) {
    const cut = Math.max(1, availableLines - 1);
    linesToRender = [
      ...rawLines.slice(0, cut),
      "(conteúdo excedente omitido para caber em 1 página)",
    ];
  }

  for (const line of linesToRender) {
    if (y <= bottomMargin) break;
    drawText(line, { size: baseFontSize });
  }

  const pdfBytes = await pdfDoc.save();
  const bytes = new Uint8Array(pdfBytes);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
