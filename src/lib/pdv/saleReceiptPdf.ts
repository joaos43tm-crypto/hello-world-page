import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type SaleReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type SaleReceiptPdfInput = {
  // Compat: legado
  storeName: string;
  // Novo: dados completos da loja
  store?: {
    name?: string;
    address?: string | null;
    whatsapp?: string | null;
    logoUrl?: string | null;
  };
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

function normalizeText(v?: string | null) {
  const t = (v ?? "").trim();
  return t.length ? t : null;
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

function wrapText(text: string, font: any, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    const width = font.widthOfTextAtSize(next, size);
    if (width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function tryEmbedLogo(pdfDoc: PDFDocument, logoUrl: string) {
  const res = await fetch(logoUrl);
  if (!res.ok) throw new Error(`logo fetch failed: ${res.status}`);

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const bytes = await res.arrayBuffer();

  if (contentType.includes("png") || getExtFromUrl(logoUrl) === "png") {
    return await pdfDoc.embedPng(bytes);
  }

  // pdf-lib suporta JPG; WEBP às vezes vem como image/webp, então tentamos JPG como fallback.
  if (contentType.includes("jpeg") || contentType.includes("jpg") || getExtFromUrl(logoUrl) === "jpg") {
    return await pdfDoc.embedJpg(bytes);
  }

  // Fallback: tenta PNG, depois JPG
  try {
    return await pdfDoc.embedPng(bytes);
  } catch {
    return await pdfDoc.embedJpg(bytes);
  }
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
  const maxTextWidth = width - marginX * 2;
  let y = height - 18;

  const draw = (
    text: string,
    opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; center?: boolean }
  ) => {
    const size = opts?.size ?? 9;
    const chosenFont = opts?.bold ? fontBold : font;
    const color = opts?.color ?? rgb(0.12, 0.12, 0.12);

    if (opts?.center) {
      const w = chosenFont.widthOfTextAtSize(text, size);
      const x = Math.max(marginX, (width - w) / 2);
      page.drawText(text, { x, y, size, font: chosenFont, color });
    } else {
      page.drawText(text, {
        x: marginX,
        y,
        size,
        font: chosenFont,
        color,
        maxWidth: maxTextWidth,
      });
    }

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

  // ===== Cabeçalho padrão BR (80mm) =====
  const storeName = normalizeText(input.store?.name) ?? normalizeText(input.storeName) ?? "PetControl";
  const storeAddress = normalizeText(input.store?.address);
  const storeWhatsapp = normalizeText(input.store?.whatsapp);
  const storeLogoUrl = normalizeText(input.store?.logoUrl);

  if (storeLogoUrl) {
    try {
      const logo = await tryEmbedLogo(pdfDoc, storeLogoUrl);
      const original = logo.scale(1);
      const desiredWidth = Math.min(170, maxTextWidth);
      const scale = desiredWidth / original.width;
      const logoH = original.height * scale;

      // desenha com topo em y, e decrementa
      page.drawImage(logo, {
        x: (width - desiredWidth) / 2,
        y: y - logoH,
        width: desiredWidth,
        height: logoH,
      });
      y -= logoH + 10;
    } catch {
      // best-effort: segue sem logo
    }
  }

  draw(storeName.toUpperCase(), { bold: true, size: 11, center: true });

  if (storeAddress) {
    for (const line of wrapText(storeAddress, font, 8, maxTextWidth)) {
      draw(line, { size: 8, color: rgb(0.35, 0.35, 0.35), center: true });
    }
  }

  if (storeWhatsapp) {
    draw(`WhatsApp: ${storeWhatsapp}`, { size: 8, color: rgb(0.35, 0.35, 0.35), center: true });
  }

  hr();

  draw("RECIBO DE VENDA", { bold: true, size: 10, center: true });
  y -= 2;

  draw(`Data: ${new Date(input.sale.createdAt).toLocaleString("pt-BR")}`, { size: 8 });
  draw(`Venda: ${input.sale.id.slice(0, 8)}`, { size: 8 });
  if (input.sale.customerName) draw(`Cliente: ${input.sale.customerName}`, { size: 8 });
  if (input.sale.paymentMethod) draw(`Pagamento: ${input.sale.paymentMethod}`, { size: 8 });
  hr();

  draw("Itens", { bold: true });
  for (const item of input.items) {
    const line1 = `${item.quantity}x ${item.name}`;
    draw(line1, { size: 8 });
    draw(`${money(item.unitPrice)}  |  Sub: ${money(item.subtotal)}`, {
      size: 8,
      color: rgb(0.35, 0.35, 0.35),
    });
    y -= 2;
  }

  hr();
  draw(`TOTAL: ${money(input.total)}`, { bold: true, size: 11 });
  y -= 6;
  draw("Obrigado e volte sempre!", { size: 8, color: rgb(0.35, 0.35, 0.35), center: true });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
