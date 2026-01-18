export async function openAndPrintPdfBytes(pdfBytes: Uint8Array) {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) return;

  const onLoad = () => {
    try {
      w.print();
    } finally {
      w.removeEventListener("load", onLoad);
    }
  };

  w.addEventListener("load", onLoad);
}
