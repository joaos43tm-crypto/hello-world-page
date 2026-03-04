import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type AppointmentsPeriodReportAppointment = {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  price: number;
  petName?: string | null;
  tutorName?: string | null;
  serviceName?: string | null;
  whatsappSent?: boolean;
};

export type AppointmentsPeriodReportInput = {
  storeName: string;
  store?: {
    address?: string | null;
    whatsapp?: string | null;
    logoUrl?: string | null;
  };
  period: { start: string; end: string };
  summary: {
    totalAppointments: number;
    totalRevenue: number;
    averageTicket: number;
    whatsappSentCount: number;
  };
  appointments: AppointmentsPeriodReportAppointment[];
};

function money(v: number) {
  return `R$ ${Number(v ?? 0).toFixed(2)}`;
}

function normalizeText(v?: string | null) {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

function shortId(id: string) {
  return (id || "").slice(0, 8);
}

function getExtFromUrl(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (path.endsWith(".png")) return "png";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "jpg";
    if (path.endsWith(".webp")) return "webp";
  } catch {
    // ignore
  }
  return null;
}

async function tryEmbedLogo(pdfDoc: PDFDocument, logoUrl: string) {
  const res = await fetch(logoUrl);
  if (!res.ok) throw new Error(`logo fetch failed: ${res.status}`);

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const bytes = await res.arrayBuffer();

  if (contentType.includes("png") || getExtFromUrl(logoUrl) === "png") {
    return await pdfDoc.embedPng(bytes);
  }

  if (contentType.includes("jpeg") || contentType.includes("jpg") || getExtFromUrl(logoUrl) === "jpg") {
    return await pdfDoc.embedJpg(bytes);
  }

  try {
    return await pdfDoc.embedPng(bytes);
  } catch {
    return await pdfDoc.embedJpg(bytes);
  }
}

function wrapText(text: string, font: any, size: number, maxWidth: number) {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    const width = font.widthOfTextAtSize(next, size);
    if (width <= maxWidth) current = next;
    else {
      if (current) lines.push(current);
      current = w;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function generateAppointmentsPeriodReportPdf(input: AppointmentsPeriodReportInput) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [841.89, 595.28]; // A4 (paisagem)
  const marginX = 42;
  const minY = 50;
  const startY = 555;

  let page = pdfDoc.addPage(pageSize);
  let y = startY;

  const { width } = page.getSize();
  const contentWidth = width - marginX * 2;

  const addPage = () => {
    page = pdfDoc.addPage(pageSize);
    y = startY;
  };

  const ensureSpace = (minHeight: number) => {
    if (y - minHeight < minY) addPage();
  };

  const drawLine = () => {
    ensureSpace(14);
    y -= 6;
    page.drawLine({
      start: { x: marginX, y },
      end: { x: width - marginX, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 10;
  };

  const drawText = (
    text: string,
    opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; x?: number }
  ) => {
    const size = opts?.size ?? 11;
    const chosenFont = opts?.bold ? fontBold : font;
    const x = opts?.x ?? marginX;
    ensureSpace(size + 8);
    page.drawText(text, {
      x,
      y,
      size,
      font: chosenFont,
      color: opts?.color ?? rgb(0.12, 0.12, 0.12),
      maxWidth: width - x - marginX,
    });
    y -= size + 6;
  };

  const drawRow = (cols: { text: string; width: number; align?: "left" | "right" }[], opts?: { bold?: boolean }) => {
    const size = 10;
    const chosenFont = opts?.bold ? fontBold : font;
    ensureSpace(size + 10);

    let x = marginX;
    for (const c of cols) {
      const txt = c.text ?? "";
      if (c.align === "right") {
        const tw = chosenFont.widthOfTextAtSize(txt, size);
        const tx = x + c.width - tw;
        page.drawText(txt, { x: tx, y, size, font: chosenFont, color: rgb(0.12, 0.12, 0.12) });
      } else {
        page.drawText(txt, { x, y, size, font: chosenFont, color: rgb(0.12, 0.12, 0.12), maxWidth: c.width });
      }
      x += c.width;
    }
    y -= size + 6;
  };

  const storeName = normalizeText(input.storeName) ?? "PetControl";
  const storeAddress = normalizeText(input.store?.address);
  const storeWhatsapp = normalizeText(input.store?.whatsapp);
  const storeLogoUrl = normalizeText(input.store?.logoUrl);

  let embeddedLogo: Awaited<ReturnType<typeof tryEmbedLogo>> | null = null;
  let logoW = 0;
  let logoH = 0;

  if (storeLogoUrl) {
    try {
      embeddedLogo = await tryEmbedLogo(pdfDoc, storeLogoUrl);
      const original = embeddedLogo.scale(1);
      logoW = 56;
      const scale = logoW / original.width;
      logoH = original.height * scale;
    } catch {
      embeddedLogo = null;
    }
  }

  if (embeddedLogo && logoH > 0) {
    page.drawImage(embeddedLogo, {
      x: marginX,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });

    const nameX = marginX + logoW + 12;
    page.drawText(storeName, {
      x: nameX,
      y: y - 4,
      size: 18,
      font: fontBold,
      color: rgb(0.12, 0.12, 0.12),
      maxWidth: width - nameX - marginX,
    });

    y -= Math.max(logoH, 24) + 8;
  } else {
    drawText(storeName, { bold: true, size: 18 });
  }

  drawText("Relatório de Atendimentos", { bold: true, size: 14 });

  if (storeAddress) {
    const lines = wrapText(storeAddress, font, 10, contentWidth);
    for (const line of lines.slice(0, 2)) {
      drawText(line, { size: 10, color: rgb(0.35, 0.35, 0.35) });
    }
  }
  if (storeWhatsapp) {
    drawText(`WhatsApp: ${storeWhatsapp}`, { size: 10, color: rgb(0.35, 0.35, 0.35) });
  }

  drawText(`Período: ${input.period.start} a ${input.period.end}`, { size: 10, color: rgb(0.35, 0.35, 0.35) });
  drawText(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, { size: 10, color: rgb(0.35, 0.35, 0.35) });
  drawLine();

  drawText("Resumo do período", { bold: true, size: 12 });
  drawText(`Atendimentos realizados: ${input.summary.totalAppointments}`, { size: 11 });
  drawText(`Faturamento em atendimentos: ${money(input.summary.totalRevenue)}`, { size: 11 });
  drawText(`Ticket médio: ${money(input.summary.averageTicket)}`, { size: 11 });
  drawText(`WhatsApp enviado: ${input.summary.whatsappSentCount}`, { size: 11 });
  y -= 6;
  drawLine();

  drawText("Atendimentos", { bold: true, size: 12 });

  const colDate = 88;
  const colTime = 52;
  const colPet = 110;
  const colTutor = 135;
  const colService = 140;
  const colStatus = 90;
  const colTotal = Math.max(70, contentWidth - (colDate + colTime + colPet + colTutor + colService + colStatus));

  drawRow(
    [
      { text: "Data", width: colDate },
      { text: "Hora", width: colTime },
      { text: "Pet", width: colPet },
      { text: "Tutor", width: colTutor },
      { text: "Serviço", width: colService },
      { text: "Status", width: colStatus },
      { text: "Valor", width: colTotal, align: "right" },
    ],
    { bold: true }
  );
  drawLine();

  for (const appt of input.appointments) {
    const dateLabel = appt.scheduledDate
      ? new Date(`${appt.scheduledDate}T00:00:00`).toLocaleDateString("pt-BR")
      : "";

    drawRow([
      { text: dateLabel, width: colDate },
      { text: appt.scheduledTime || "", width: colTime },
      { text: appt.petName || "-", width: colPet },
      { text: appt.tutorName || "-", width: colTutor },
      { text: appt.serviceName || "-", width: colService },
      { text: appt.status || "-", width: colStatus },
      { text: money(appt.price), width: colTotal, align: "right" },
    ]);

    drawText(`ID #${shortId(appt.id)} • WhatsApp: ${appt.whatsappSent ? "Sim" : "Não"}`, {
      size: 9,
      color: rgb(0.35, 0.35, 0.35),
    });

    y -= 2;
    drawLine();
  }

  return await pdfDoc.save();
}
