// Browser-only: finds the invoice QR in a PDF or an image without leaving the device.
// The decoding libraries load on first use, so they don't weigh on the page.

const noQr =
  "No encontramos el código QR de la factura. Prueba con una foto más nítida o una captura del código.";
const isInvoiceQr = (text: string) => /comparador\.cnmc\.gob\.es/i.test(text);

/** Returns the invoice QR's text, or throws a Spanish message. */
export async function decodeInvoiceQr(file: File): Promise<string> {
  const pages =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name)
      ? await pdfPages(file)
      : [await imageData(file)];
  for (const page of pages) {
    const text = await readQr(await page());
    if (text) return text;
  }
  throw new Error(noQr);
}

type Page = () => Promise<ImageData>;

async function imageData(file: File): Promise<Page> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("No se pudo abrir la imagen. Usa un PDF, JPG o PNG.");
  });
  return async () => {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  };
}

async function pdfPages(file: File): Promise<Page[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const pdf = await pdfjs
    .getDocument({ data: await file.arrayBuffer() })
    .promise.catch(() => {
      throw new Error("No se pudo abrir el PDF de la factura.");
    });
  return Array.from({ length: pdf.numPages }, (_, index) => async () => {
    const page = await pdf.getPage(index + 1);
    // About 300 dpi: enough for the 3×3 cm minimum QR.
    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d")!;
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return context.getImageData(0, 0, canvas.width, canvas.height);
  });
}

async function readQr(image: ImageData): Promise<string> {
  if ("BarcodeDetector" in globalThis) {
    try {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const found = await detector.detect(image);
      const text = found.map((code) => code.rawValue).find(isInvoiceQr);
      if (text) return text;
    } catch {
      /* Unsupported format or platform: fall back to zxing. */
    }
  }
  const readBarcodes = await zxing();
  const found = await readBarcodes(image, {
    formats: ["QRCode"],
    tryHarder: true,
    maxNumberOfSymbols: 4,
  });
  return found.map((code) => code.text).find(isInvoiceQr) ?? "";
}

let zxingReader: Promise<typeof import("zxing-wasm/reader").readBarcodes>;
function zxing() {
  zxingReader ??= import("zxing-wasm/reader").then(
    ({ prepareZXingModule, readBarcodes }) => {
      prepareZXingModule({
        overrides: {
          // Served from this site, not the library's default CDN.
          locateFile: (path: string, prefix: string) =>
            path.endsWith(".wasm")
              ? new URL(
                  "zxing-wasm/reader/zxing_reader.wasm",
                  import.meta.url,
                ).toString()
              : prefix + path,
        },
      });
      return readBarcodes;
    },
  );
  return zxingReader;
}

declare global {
  // Not yet in TypeScript's DOM types.
  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(image: ImageData): Promise<{ rawValue: string }[]>;
  }
}
