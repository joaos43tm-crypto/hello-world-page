import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type SaleReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type SaleReceiptPdfInput = {
  storeName: string;
  sale: {
    id: string;
    createdAt: string;
    paymentMethod?: string | null;
    customerName?: string | null;
  };
  items: SaleReceiptItem[];
  total: number;
};

function money(v: number) {
  return `R$ ${v.toFixed(2)}`;
}

// Receipt-style PDF (fits thermal printers when printed in 80mm mode)
export async function generateSaleReceiptPdf(input: SaleReceiptPdfInput) {
  const width = 226; // ~80mm in points
  const height = 680; // enough for typical receipts; browser will paginate if needed

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([width, height]);
  const marginX = 12;
  let y = height - 18;

  const draw = (text: string, opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }) => {
    const size = opts?.size ?? 9;
    const chosenFont = opts?.bold ? fontBold : font;
    page.drawText(text, {
      x: marginX,
      y,
      size,
      font: chosenFont,
      color: opts?.color ?? rgb(0.12, 0.12, 0.12),
      maxWidth: width - marginX * 2,
    });
    y -= size + 4;
  };

  const hr = () => {
    y -= 2;
    page.drawLine({
      start: { x: marginX, y },
      end: { x: width - marginX, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 8;
  };

  draw((input.storeName || "PetControl").toUpperCase(), { bold: true, size: 11 });
  draw("RECIBO DE VENDA", { bold: true, size: 10 });
  hr();

  draw(`Data: ${new Date(input.sale.createdAt).toLocaleString("pt-BR")}`, { size: 8 });
  draw(`Venda: ${input.sale.id.slice(0, 8)}`, { size: 8 });
  if (input.sale.customerName) draw(`Cliente: ${input.sale.customerName}`, { size: 8 });
  if (input.sale.paymentMethod) draw(`Pagamento: ${input.sale.paymentMethod}`, { size: 8 });
  hr();

  draw("Itens", { bold: true });
  for (const item of input.items) {
    const line1 = `${item.quantity}x ${item.name}`;
    draw(line1, { size: 8 });
    draw(`${money(item.unitPrice)}  |  Sub: ${money(item.subtotal)}`, { size: 8, color: rgb(0.35, 0.35, 0.35) });
    y -= 2;
  }

  hr();
  draw(`TOTAL: ${money(input.total)}`, { bold: true, size: 11 });
  y -= 6;
  draw("Obrigado e volte sempre!", { size: 8, color: rgb(0.35, 0.35, 0.35) });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
