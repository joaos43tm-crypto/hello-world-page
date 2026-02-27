import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type CashPeriodReportSession = {
  id: string;
  openedAt: string;
  closedAt?: string | null;
  openingBalance: number;
  closingBalance?: number | null;
  notes?: string | null;
  totals?: {
    salesTotal: number;
    salesCount: number;
    sangriaTotal: number;
    suprimentoTotal: number;
    expectedCash: number;
    difference: number;
  };
};

export type CashPeriodReportInput = {
  storeName: string;
  period: { start: string; end: string };
  sessions: CashPeriodReportSession[];
  totals: {
    salesTotal: number;
    salesCount: number;
    sangriaTotal: number;
    suprimentoTotal: number;
    openingBalanceTotal: number;
    closingBalanceTotal: number;
    expectedCashTotal: number;
    differenceTotal: number;
  };
};

function money(v: number) {
  return `R$ ${Number(v ?? 0).toFixed(2)}`;
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

export async function generateCashPeriodReportPdf(input: CashPeriodReportInput) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const marginX = 42;
  const minY = 60;
  const startY = 800;

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

  // ===== Header =====
  drawText(input.storeName || "PetControl", { bold: true, size: 18 });
  drawText("Relatório de Caixa", { bold: true, size: 14 });
  drawText(`Período: ${input.period.start} a ${input.period.end}`, { size: 10, color: rgb(0.35, 0.35, 0.35) });
  drawText(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, { size: 10, color: rgb(0.35, 0.35, 0.35) });
  drawLine();

  // ===== Totals =====
  drawText("Totais do período (somente sessões fechadas)", { bold: true, size: 12 });
  drawText(`Vendas (${input.totals.salesCount}): ${money(input.totals.salesTotal)}`, { size: 11 });
  drawText(`Suprimentos: ${money(input.totals.suprimentoTotal)}`, { size: 11 });
  drawText(`Sangrias: ${money(input.totals.sangriaTotal)}`, { size: 11 });
  y -= 4;
  drawText(`Saldo de abertura (soma): ${money(input.totals.openingBalanceTotal)}`, { size: 11 });
  drawText(`Saldo de fechamento (soma): ${money(input.totals.closingBalanceTotal)}`, { size: 11 });
  y -= 4;

  const diffColor =
    input.totals.differenceTotal === 0
      ? rgb(0.12, 0.12, 0.12)
      : input.totals.differenceTotal > 0
        ? rgb(0.1, 0.5, 0.2)
        : rgb(0.8, 0.2, 0.2);

  drawText(`Caixa esperado (dinheiro): ${money(input.totals.expectedCashTotal)}`, { bold: true, size: 11 });
  drawText(`Diferença total: ${money(input.totals.differenceTotal)}`, { bold: true, size: 11, color: diffColor });

  y -= 6;
  drawLine();

  // ===== Sessions list =====
  drawText("Sessões", { bold: true, size: 12 });

  const colOpen = 130;
  const colClose = 130;
  const colOpenBal = 80;
  const colCloseBal = 90;
  const colStatus = Math.max(60, contentWidth - (colOpen + colClose + colOpenBal + colCloseBal));

  drawRow(
    [
      { text: "Abertura", width: colOpen },
      { text: "Fechamento", width: colClose },
      { text: "Abertura", width: colOpenBal, align: "right" },
      { text: "Fechamento", width: colCloseBal, align: "right" },
      { text: "Status", width: colStatus },
    ],
    { bold: true }
  );
  drawLine();

  for (const s of input.sessions) {
    const opened = s.openedAt ? new Date(s.openedAt).toLocaleString("pt-BR") : "";
    const closed = s.closedAt ? new Date(s.closedAt).toLocaleString("pt-BR") : "";
    const status = s.closedAt ? "FECHADO" : "ABERTO";

    drawRow([
      { text: opened, width: colOpen },
      { text: closed, width: colClose },
      { text: money(Number(s.openingBalance ?? 0)), width: colOpenBal, align: "right" },
      { text: s.closedAt ? money(Number(s.closingBalance ?? 0)) : "-", width: colCloseBal, align: "right" },
      { text: status, width: colStatus },
    ]);

    if (s.closedAt && s.totals) {
      ensureSpace(50);
      y -= 2;
      drawText(
        `Resumo: Vendas (${s.totals.salesCount}) ${money(s.totals.salesTotal)} • Supr ${money(s.totals.suprimentoTotal)} • Sang ${money(s.totals.sangriaTotal)}`,
        { size: 10, color: rgb(0.35, 0.35, 0.35) }
      );
      const dColor = s.totals.difference === 0 ? rgb(0.35, 0.35, 0.35) : s.totals.difference > 0 ? rgb(0.1, 0.5, 0.2) : rgb(0.8, 0.2, 0.2);
      drawText(
        `Esperado: ${money(s.totals.expectedCash)} • Diferença: ${money(s.totals.difference)}`,
        { size: 10, color: dColor }
      );

      if (s.notes?.trim()) {
        drawText("Observações:", { bold: true, size: 10 });
        const lines = wrapText(s.notes.trim(), font, 10, contentWidth);
        for (const line of lines.slice(0, 8)) drawText(line, { size: 10 });
      }

      y -= 6;
      drawLine();
    } else {
      y -= 6;
      drawLine();
    }
  }

  // Footer
  ensureSpace(24);
  const footerY = 40;
  page.drawLine({
    start: { x: marginX, y: footerY + 20 },
    end: { x: width - marginX, y: footerY + 20 },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });
  page.drawText("Gerado pelo PetControl", {
    x: marginX,
    y: footerY,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return await pdfDoc.save();
}
