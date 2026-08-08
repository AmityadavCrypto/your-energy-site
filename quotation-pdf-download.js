(function initQuotationPdfDownload(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.QuotationPdfDownload = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createQuotationPdfDownload() {
  // html2pdf converts A4's 210 mm width to 793 CSS pixels at 96 DPI.
  const A4_WIDTH_PX = 793;

  function sanitizeFilenamePart(value, fallback = "Customer") {
    const normalized = String(value || "")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    return normalized || fallback;
  }

  function normalizeDate(value) {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : new Date().toISOString().slice(0, 10);
  }

  function buildFilename(lead = {}) {
    const customer = sanitizeFilenamePart(lead.projectName || lead.name);
    const quotationDate = normalizeDate(lead.quotation?.quotationDate);
    return `Your-Energy-Solar-Quotation-${customer}-${quotationDate}.pdf`;
  }

  function getPdfOptions(filename) {
    return {
      margin: 0,
      filename,
      enableLinks: true,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        backgroundColor: "#ffffff",
        logging: false,
        scale: 2,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        width: A4_WIDTH_PX,
        windowWidth: A4_WIDTH_PX,
      },
      jsPDF: {
        compress: true,
        format: "a4",
        orientation: "portrait",
        unit: "mm",
      },
      pagebreak: {
        mode: ["css", "legacy"],
        before: ".page-break-before",
        avoid: [".quotation-masthead", ".quote-hero-strip", ".quote-note", "tr"],
      },
    };
  }

  function createRenderStage(documentRef, html, styles) {
    const layoutTargets = [documentRef.documentElement, documentRef.body].filter(Boolean);
    const previousLayout = layoutTargets.map((element) => ({
      element,
      minWidth: element.style.minWidth,
      overflow: element.style.overflow,
      overflowX: element.style.overflowX,
    }));

    layoutTargets.forEach((element) => {
      element.style.minWidth = `${A4_WIDTH_PX}px`;
      element.style.overflow = "visible";
      element.style.overflowX = "visible";
    });

    const styleElement = documentRef.createElement("style");
    styleElement.dataset.quotationPdfStyles = "true";
    styleElement.textContent = styles;
    documentRef.head.appendChild(styleElement);

    const host = documentRef.createElement("div");
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, {
      background: "#ffffff",
      margin: "0",
      pointerEvents: "none",
      width: `${A4_WIDTH_PX}px`,
    });

    const stage = documentRef.createElement("div");
    stage.className = "quotation-pdf-stage";
    stage.style.margin = "0";
    stage.style.maxWidth = `${A4_WIDTH_PX}px`;
    stage.style.minWidth = `${A4_WIDTH_PX}px`;
    stage.style.width = `${A4_WIDTH_PX}px`;
    stage.innerHTML = html;
    host.appendChild(stage);
    documentRef.body.insertBefore(host, documentRef.body.firstChild || null);

    // Keep the render source inside the viewport so html2canvas can capture it.
    // A separate cover prevents the temporary quotation from flashing onscreen.
    const cover = documentRef.createElement("div");
    cover.setAttribute("aria-live", "polite");
    cover.setAttribute("role", "status");
    cover.textContent = "Preparing your PDF download...";
    Object.assign(cover.style, {
      alignItems: "center",
      background: "#f4f8ee",
      color: "#08203f",
      display: "flex",
      fontFamily: "sans-serif",
      fontSize: "16px",
      fontWeight: "700",
      inset: "0",
      justifyContent: "center",
      position: "fixed",
      zIndex: "2147483647",
    });
    documentRef.body.appendChild(cover);

    const restoreLayout = () => {
      previousLayout.forEach(({ element, minWidth, overflow, overflowX }) => {
        element.style.minWidth = minWidth;
        element.style.overflow = overflow;
        element.style.overflowX = overflowX;
      });
    };

    return { cover, host, restoreLayout, stage, styleElement };
  }

  function waitForImage(image) {
    if (image.complete && image.naturalWidth > 0) {
      return typeof image.decode === "function" ? image.decode().catch(() => undefined) : Promise.resolve();
    }

    return new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }

  async function waitForDocument(documentRef, stage) {
    if (documentRef.fonts?.ready) {
      await documentRef.fonts.ready;
    }

    await Promise.all(Array.from(stage.querySelectorAll("img")).map(waitForImage));

    const frameWindow = documentRef.defaultView;
    if (frameWindow?.requestAnimationFrame) {
      await new Promise((resolve) => frameWindow.requestAnimationFrame(() => frameWindow.requestAnimationFrame(resolve)));
    }
  }

  async function downloadHtml({ html, styles, filename, documentRef, html2pdfFactory }) {
    if (!documentRef?.body) {
      throw new Error("The quotation document is not available.");
    }
    if (typeof html2pdfFactory !== "function") {
      throw new Error("The PDF generator did not load. Refresh the page and try again.");
    }

    const { cover, host, restoreLayout, stage, styleElement } = createRenderStage(documentRef, html, styles);

    try {
      await waitForDocument(documentRef, stage);
      const quotation = stage.querySelector(".quotation-document");
      if (!quotation) {
        throw new Error("The quotation could not be prepared for download.");
      }

      // Override millimetre/max-width rules so the capture cannot reflow or crop.
      Object.assign(quotation.style, {
        margin: "0",
        maxWidth: `${A4_WIDTH_PX}px`,
        minWidth: `${A4_WIDTH_PX}px`,
        width: `${A4_WIDTH_PX}px`,
      });

      await html2pdfFactory().set(getPdfOptions(filename)).from(stage).save();
      return filename;
    } finally {
      cover.remove();
      host.remove();
      styleElement.remove();
      restoreLayout();
    }
  }

  return {
    buildFilename,
    downloadHtml,
    getPdfOptions,
    sanitizeFilenamePart,
  };
});
