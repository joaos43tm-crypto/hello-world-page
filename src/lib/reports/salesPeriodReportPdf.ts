import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type SalesPeriodReportMode = "simples" | "detalhado";

export type SalesPeriodReportSaleItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type SalesPeriodReportSale = {
  id: string;
  createdAt: string;
  customerName?: string | null;
  paymentMethod?: string | null;
  totalAmount: number;
  items?: SalesPeriodReportSaleItem[];
};

export type SalesPeriodReportInput = {
  storeName: string;
  period: { start: string; end: string };
  mode: SalesPeriodReportMode;
  sales: SalesPeriodReportSale[];
};

function money(v: number) {
  return `R$ ${Number(v ?? 0).toFixed(2)}`;
}

function shortId(id: string) {
  return (id || "").slice(0, 8);
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

export async function generateSalesPeriodReportPdf(input: SalesPeriodReportInput) {
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
  drawText("Relatório de Vendas", { bold: true, size: 14 });
  drawText(`Período: ${input.period.start} a ${input.period.end}`, { size: 10, color: rgb(0.35, 0.35, 0.35) });
  drawText(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, { size: 10, color: rgb(0.35, 0.35, 0.35) });
  drawLine();

  // ===== Summary =====
  const salesCount = input.sales.length;
  const total = input.sales.reduce((sum, s) => sum + Number(s.totalAmount ?? 0), 0);
  const avg = salesCount ? total / salesCount : 0;

  drawText("Resumo do período", { bold: true, size: 12 });
  drawText(`Quantidade de vendas: ${salesCount}`, { size: 11 });
  drawText(`Total faturado: ${money(total)}`, { size: 11 });
  drawText(`Ticket médio: ${money(avg)}`, { size: 11 });

  y -= 6;
  drawLine();

  // ===== List =====
  drawText(`Lista de vendas (${input.mode === "detalhado" ? "Detalhado" : "Simples"})`, { bold: true, size: 12 });

  const colDate = 120;
  const colId = 70;
  const colPay = 110;
  const colTotal = 90;
  const colCustomer = Math.max(80, contentWidth - (colDate + colId + colPay + colTotal));

  drawRow(
    [
      { text: "Data", width: colDate },
      { text: "Venda", width: colId },
      { text: "Cliente", width: colCustomer },
      { text: "Pagamento", width: colPay },
      { text: "Total", width: colTotal, align: "right" },
    ],
    { bold: true }
  );
  drawLine();

  for (const sale of input.sales) {
    const created = sale.createdAt ? new Date(sale.createdAt).toLocaleString("pt-BR") : "";
    drawRow([
      { text: created, width: colDate },
      { text: shortId(sale.id), width: colId },
      { text: (sale.customerName ?? "Cliente não identificado") as string, width: colCustomer },
      { text: (sale.paymentMethod ?? "") as string, width: colPay },
      { text: money(Number(sale.totalAmount ?? 0)), width: colTotal, align: "right" },
    ]);

    if (input.mode === "detalhado") {
      const items = sale.items ?? [];
      if (items.length) {
        ensureSpace(24);
        y -= 2;
        drawText("Itens", { bold: true, size: 11 });

        const iColName = contentWidth - 50 - 80 - 90;
        const iColQty = 50;
        const iColUnit = 80;
        const iColSub = 90;

        drawRow(
          [
            { text: "Item", width: iColName },
            { text: "Qtd", width: iColQty, align: "right" },
            { text: "Unit", width: iColUnit, align: "right" },
            { text: "Sub", width: iColSub, align: "right" },
          ],
          { bold: true }
        );

        for (const it of items) {
          const nameLines = wrapText(it.name, font, 10, iColName);
          for (let li = 0; li < nameLines.length; li++) {
            if (li === 0) {
              drawRow([
                { text: nameLines[li], width: iColName },
                { text: String(it.quantity), width: iColQty, align: "right" },
                { text: money(it.unitPrice), width: iColUnit, align: "right" },
                { text: money(it.subtotal), width: iColSub, align: "right" },
              ]);
            } else {
              drawRow([
                { text: nameLines[li], width: iColName },
                { text: "", width: iColQty },
                { text: "", width: iColUnit },
                { text: "", width: iColSub },
              ]);
            }
          }
        }
      }

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
