import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type CashClosingReportInput = {
  storeName: string;
  session: {
    id: string;
    openedAt: string;
    closedAt: string;
    openingBalance: number;
    closingBalance: number;
    openedBy?: string;
    closedBy?: string;
  };
  totals: {
    salesTotal: number;
    sangriaTotal: number;
    suprimentoTotal: number;
    expectedCash: number;
    difference: number;
    salesCount: number;
  };
  notes?: string | null;
};

function money(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

export async function generateCashClosingPdf(input: CashClosingReportInput) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();

  const marginX = 42;
  let y = 800;

  const draw = (text: string, opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }) => {
    const size = opts?.size ?? 11;
    const chosenFont = opts?.bold ? fontBold : font;
    page.drawText(text, {
      x: marginX,
      y,
      size,
      font: chosenFont,
      color: opts?.color ?? rgb(0.1, 0.1, 0.1),
    });
    y -= size + 6;
  };

  // Header
  draw(input.storeName || "PetControl", { bold: true, size: 18 });
  draw("Fechamento de Caixa", { bold: true, size: 14 });
  y -= 8;

  // Session info
  draw(`Sessão: ${input.session.id}`, { size: 10 });
  draw(`Abertura: ${new Date(input.session.openedAt).toLocaleString("pt-BR")}`, { size: 10 });
  draw(`Fechamento: ${new Date(input.session.closedAt).toLocaleString("pt-BR")}`, { size: 10 });
  y -= 10;

  // Totals
  draw("Resumo", { bold: true, size: 12 });
  draw(`Saldo de abertura: ${money(input.session.openingBalance)}`);
  draw(`Vendas (${input.totals.salesCount}): ${money(input.totals.salesTotal)}`);
  draw(`Suprimentos: ${money(input.totals.suprimentoTotal)}`);
  draw(`Sangrias: ${money(input.totals.sangriaTotal)}`);
  y -= 6;

  draw(`Caixa esperado (dinheiro): ${money(input.totals.expectedCash)}`, { bold: true });
  draw(`Contagem informada: ${money(input.session.closingBalance)}`, { bold: true });

  const diffColor = input.totals.difference === 0 ? rgb(0.1, 0.1, 0.1) : input.totals.difference > 0 ? rgb(0.1, 0.5, 0.2) : rgb(0.8, 0.2, 0.2);
  draw(`Diferença: ${money(input.totals.difference)}`, { bold: true, color: diffColor });

  if (input.notes?.trim()) {
    y -= 10;
    draw("Observações", { bold: true, size: 12 });
    const lines = input.notes.trim().split(/\r?\n/);
    for (const line of lines.slice(0, 12)) {
      draw(line, { size: 10 });
    }
  }

  // Footer
  const footerY = 40;
  page.drawLine({ start: { x: marginX, y: footerY + 20 }, end: { x: width - marginX, y: footerY + 20 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  page.drawText("Gerado pelo PetControl", { x: marginX, y: footerY, size: 9, font, color: rgb(0.4, 0.4, 0.4) });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
