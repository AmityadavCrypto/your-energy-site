(function initQuotationPdfDownload(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.QuotationPdfDownload = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function createQuotationPdfDownload() {
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 38;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const CONTENT_BOTTOM = PAGE_HEIGHT - 43;
  const COLORS = Object.freeze({
    navy: [8, 32, 63],
    green: [118, 195, 0],
    greenDark: [79, 145, 0],
    pale: [241, 247, 235],
    paleStrong: [230, 241, 221],
    line: [183, 199, 173],
    muted: [88, 108, 132],
    white: [255, 255, 255],
  });

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

  function sanitizePdfText(value) {
    return String(value ?? "-")
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\u2026/g, "...")
      .replace(/\u20b9/g, "Rs.")
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
  }

  function color(rgb, pdfLib) {
    return pdfLib.rgb(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
  }

  function wrapText(text, font, size, maxWidth) {
    const paragraphs = sanitizePdfText(text).split(/\r?\n/);
    const lines = [];

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push("");
      } else {
        let line = "";
        words.forEach((word) => {
          const candidate = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
            line = candidate;
            return;
          }

          if (line) lines.push(line);
          if (font.widthOfTextAtSize(word, size) <= maxWidth) {
            line = word;
            return;
          }

          let fragment = "";
          Array.from(word).forEach((character) => {
            const candidateFragment = `${fragment}${character}`;
            if (font.widthOfTextAtSize(candidateFragment, size) <= maxWidth) {
              fragment = candidateFragment;
            } else {
              if (fragment) lines.push(fragment);
              fragment = character;
            }
          });
          line = fragment;
        });
        if (line) lines.push(line);
      }

      if (paragraphIndex < paragraphs.length - 1) lines.push("");
    });

    return lines.length ? lines : [""];
  }

  async function embedLogo(pdfDoc, source, fetchImpl) {
    if (!source) return null;

    try {
      if (typeof source !== "string" || source.startsWith("data:image/png")) {
        return await pdfDoc.embedPng(source);
      }

      const response = await fetchImpl(source);
      if (!response.ok) return null;
      return await pdfDoc.embedPng(await response.arrayBuffer());
    } catch (_error) {
      return null;
    }
  }

  function createRenderer({ pdfDoc, pdfLib, regular, bold, logo }) {
    let page;
    let cursorY;
    const pages = [];

    function drawRect(x, top, width, height, options = {}) {
      page.drawRectangle({
        x,
        y: PAGE_HEIGHT - top - height,
        width,
        height,
        ...options,
      });
    }

    function drawLine(x1, top1, x2, top2, thickness, lineColor) {
      page.drawLine({
        start: { x: x1, y: PAGE_HEIGHT - top1 },
        end: { x: x2, y: PAGE_HEIGHT - top2 },
        thickness,
        color: lineColor,
      });
    }

    function drawTextLine(text, x, top, options = {}) {
      const size = options.size || 9;
      page.drawText(sanitizePdfText(text), {
        x,
        y: PAGE_HEIGHT - top - size,
        size,
        font: options.font || regular,
        color: options.color || color(COLORS.navy, pdfLib),
      });
    }

    function drawWrappedText(text, x, top, width, options = {}) {
      const size = options.size || 9;
      const lineHeight = options.lineHeight || size * 1.3;
      const font = options.font || regular;
      const lines = wrapText(text, font, size, width);
      lines.forEach((line, index) => drawTextLine(line, x, top + index * lineHeight, { ...options, size, font }));
      return { height: Math.max(lineHeight, lines.length * lineHeight), lines };
    }

    function drawCenteredText(text, x, top, width, options = {}) {
      const size = options.size || 9;
      const font = options.font || regular;
      const safeText = sanitizePdfText(text);
      const textWidth = font.widthOfTextAtSize(safeText, size);
      drawTextLine(safeText, x + Math.max(0, (width - textWidth) / 2), top, { ...options, size, font });
    }

    function drawPowerMark(centerX, top) {
      const centerY = PAGE_HEIGHT - top - 15;
      page.drawCircle({ x: centerX, y: centerY, size: 14, color: color(COLORS.navy, pdfLib) });
      page.drawCircle({ x: centerX, y: centerY, size: 7.5, color: color(COLORS.pale, pdfLib) });
      drawRect(centerX - 2.4, top - 1, 4.8, 17, { color: color(COLORS.green, pdfLib) });
    }

    function drawContinuationHeader() {
      if (logo) {
        const logoWidth = 67;
        const logoHeight = logoWidth / (logo.width / logo.height);
        page.drawImage(logo, {
          x: MARGIN,
          y: PAGE_HEIGHT - 26 - logoHeight,
          width: logoWidth,
          height: logoHeight,
        });
      } else {
        drawTextLine("YOUR ENERGY", MARGIN, 27, { font: bold, size: 12 });
      }
      drawTextLine("SOLAR PROJECT QUOTATION", PAGE_WIDTH - MARGIN - 152, 29, {
        font: bold,
        size: 9,
        color: color(COLORS.greenDark, pdfLib),
      });
      drawLine(MARGIN, 51, PAGE_WIDTH - MARGIN, 51, 1.6, color(COLORS.green, pdfLib));
      cursorY = 65;
    }

    function addPage(continuation = true) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      drawRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, { color: color(COLORS.white, pdfLib) });
      cursorY = MARGIN;
      if (continuation) drawContinuationHeader();
      return page;
    }

    function ensureSpace(height, options = {}) {
      if (cursorY + height <= CONTENT_BOTTOM) return false;
      addPage(true);
      if (typeof options.afterPageBreak === "function") options.afterPageBreak();
      return true;
    }

    function drawFirstPageHeader(model) {
      drawRect(0, 0, PAGE_WIDTH, 184, { color: color(COLORS.pale, pdfLib) });

      if (logo) {
        const logoWidth = 104;
        const logoHeight = logoWidth / (logo.width / logo.height);
        page.drawImage(logo, {
          x: MARGIN,
          y: PAGE_HEIGHT - 60 - logoHeight,
          width: logoWidth,
          height: logoHeight,
        });
      } else {
        drawTextLine("YOUR ENERGY", MARGIN, 72, { font: bold, size: 18 });
      }

      const companyX = 158;
      drawTextLine(model.company.kicker, companyX, 27, {
        font: bold,
        size: 7.2,
        color: color(COLORS.greenDark, pdfLib),
      });
      drawWrappedText("Solar Project Quotation", companyX, 43, 220, {
        font: bold,
        size: 19,
        lineHeight: 19,
      });

      const contactLines = [
        `Registered Office: ${model.company.registeredOffice}`,
        `Branch 1: ${model.company.branchOne}`,
        `Branch 2: ${model.company.branchTwo}`,
        `GSTIN: ${model.company.gstin}`,
        `Website: ${model.company.website}`,
        `Phone: ${model.company.phone}`,
      ];
      let companyTop = 85;
      contactLines.forEach((line) => {
        const block = drawWrappedText(line, companyX, companyTop, 224, { size: 7.5, lineHeight: 9.5 });
        companyTop += block.height;
      });

      const cardX = 411;
      const cardTop = 24;
      const cardWidth = 146;
      const cardHeight = 139;
      drawRect(cardX, cardTop, cardWidth, cardHeight, {
        color: color([235, 244, 249], pdfLib),
        borderColor: color([208, 224, 204], pdfLib),
        borderWidth: 0.7,
      });
      drawPowerMark(cardX + cardWidth / 2, cardTop + 13);
      drawCenteredText("FINAL QUOTATION", cardX, cardTop + 51, cardWidth, {
        font: bold,
        size: 7.5,
        color: color(COLORS.greenDark, pdfLib),
      });
      drawCenteredText(model.quotation.total, cardX, cardTop + 73, cardWidth, { font: bold, size: 18 });
      drawCenteredText(`Date: ${model.quotation.date}`, cardX, cardTop + 105, cardWidth, {
        size: 7.6,
        color: color(COLORS.muted, pdfLib),
      });
      drawCenteredText(`Prepared By: ${model.quotation.preparedBy}`, cardX, cardTop + 122, cardWidth, {
        size: 7.6,
        color: color(COLORS.muted, pdfLib),
      });
      drawLine(0, 184, PAGE_WIDTH, 184, 2.4, color(COLORS.green, pdfLib));

      const heroTop = 184;
      const heroHeight = 48;
      const widths = [154, 220, 145];
      const values = [
        ["CUSTOMER", model.summary.customer],
        ["SYSTEM", model.summary.system],
        ["LOCATION", model.summary.location],
      ];
      let x = MARGIN;
      values.forEach(([label, value], index) => {
        drawRect(x, heroTop, widths[index], heroHeight, {
          color: color(index % 2 ? [247, 250, 244] : [242, 248, 237], pdfLib),
          borderColor: color([218, 229, 211], pdfLib),
          borderWidth: 0.45,
        });
        drawTextLine(label, x + 9, heroTop + 8, { font: bold, size: 6.5, color: color(COLORS.muted, pdfLib) });
        drawWrappedText(value, x + 9, heroTop + 22, widths[index] - 18, { font: bold, size: 7.5, lineHeight: 9 });
        x += widths[index];
      });
      cursorY = heroTop + heroHeight + 14;
    }

    function drawSectionTitle(title, minimumFollowingSpace = 0) {
      ensureSpace(31 + minimumFollowingSpace);
      drawRect(MARGIN, cursorY, CONTENT_WIDTH, 23, { color: color(COLORS.pale, pdfLib) });
      drawRect(MARGIN, cursorY, 4, 23, { color: color(COLORS.green, pdfLib) });
      drawTextLine(title, MARGIN + 11, cursorY + 6, { font: bold, size: 10 });
      cursorY += 30;
    }

    function measureTableRow(cells, widths, options = {}) {
      const paddingX = options.paddingX || 6;
      const paddingY = options.paddingY || 5;
      const font = options.font || regular;
      const size = options.size || 7.5;
      const lineHeight = options.lineHeight || 9.5;
      const lineCounts = cells.map((cell, index) => wrapText(cell, font, size, widths[index] - paddingX * 2).length);
      return Math.max(options.minimumHeight || 20, Math.max(...lineCounts) * lineHeight + paddingY * 2);
    }

    function drawTableRow(cells, widths, rowHeight, options = {}) {
      const paddingX = options.paddingX || 6;
      const paddingY = options.paddingY || 5;
      const font = options.font || regular;
      const size = options.size || 7.5;
      const lineHeight = options.lineHeight || 9.5;
      let x = MARGIN;
      cells.forEach((cell, index) => {
        drawRect(x, cursorY, widths[index], rowHeight, {
          color: options.fill ? color(options.fill, pdfLib) : color(COLORS.white, pdfLib),
          borderColor: color(COLORS.line, pdfLib),
          borderWidth: 0.55,
        });
        drawWrappedText(cell, x + paddingX, cursorY + paddingY, widths[index] - paddingX * 2, {
          font,
          size,
          lineHeight,
        });
        x += widths[index];
      });
      cursorY += rowHeight;
    }

    function drawTable(headers, rows, widths, options = {}) {
      const headerHeight = measureTableRow(headers, widths, {
        ...options,
        font: bold,
        minimumHeight: options.headerHeight || 22,
      });
      const drawHeader = () => {
        ensureSpace(headerHeight + 20);
        drawTableRow(headers, widths, headerHeight, {
          ...options,
          font: bold,
          fill: COLORS.paleStrong,
        });
      };

      drawHeader();
      rows.forEach((row) => {
        const rowHeight = measureTableRow(row, widths, options);
        ensureSpace(rowHeight, { afterPageBreak: drawHeader });
        drawTableRow(row, widths, rowHeight, options);
      });
      cursorY += 8;
    }

    function drawKeyValueTable(rows) {
      drawTable(["Detail", "Information"], rows, [145, CONTENT_WIDTH - 145], {
        size: 8,
        lineHeight: 10,
        minimumHeight: 21,
      });
    }

    function drawParagraph(text, options = {}) {
      const size = options.size || 8.2;
      const lineHeight = options.lineHeight || 11;
      const lines = wrapText(text, options.font || regular, size, CONTENT_WIDTH - (options.indent || 0));
      const height = lines.length * lineHeight + (options.after || 8);
      ensureSpace(height);
      drawWrappedText(text, MARGIN + (options.indent || 0), cursorY, CONTENT_WIDTH - (options.indent || 0), {
        size,
        lineHeight,
        font: options.font || regular,
        color: options.color || color(COLORS.navy, pdfLib),
      });
      cursorY += height;
    }

    function drawNote(label, text) {
      const content = `${label}: ${text}`;
      const lines = wrapText(content, regular, 8, CONTENT_WIDTH - 20);
      const height = Math.max(31, lines.length * 10 + 14);
      ensureSpace(height + 8);
      drawRect(MARGIN, cursorY, CONTENT_WIDTH, height, {
        color: color([248, 251, 245], pdfLib),
        borderColor: color([215, 228, 206], pdfLib),
        borderWidth: 0.6,
      });
      drawWrappedText(content, MARGIN + 10, cursorY + 7, CONTENT_WIDTH - 20, { size: 8, lineHeight: 10 });
      cursorY += height + 9;
    }

    function drawBulletList(items) {
      items.forEach((item) => {
        const textWidth = CONTENT_WIDTH - 17;
        const lines = wrapText(item, regular, 8.2, textWidth);
        const height = Math.max(13, lines.length * 10.5 + 3);
        ensureSpace(height);
        page.drawCircle({
          x: MARGIN + 4,
          y: PAGE_HEIGHT - cursorY - 7,
          size: 1.7,
          color: color(COLORS.greenDark, pdfLib),
        });
        drawWrappedText(item, MARGIN + 13, cursorY, textWidth, { size: 8.2, lineHeight: 10.5 });
        cursorY += height;
      });
      cursorY += 5;
    }

    function drawSignoff(model) {
      const signoffWidth = 238;
      const remarksLines = wrapText(model.remarks, regular, 8, CONTENT_WIDTH - 20);
      const remarksHeight = Math.max(34, remarksLines.length * 10 + 14);
      ensureSpace(130 + remarksHeight);
      drawParagraph(model.closingText, { after: 10 });
      const x = PAGE_WIDTH - MARGIN - signoffWidth;
      drawRect(x, cursorY, signoffWidth, 83, {
        color: color([247, 250, 244], pdfLib),
        borderColor: color([215, 228, 206], pdfLib),
        borderWidth: 0.65,
      });
      drawTextLine("Yours Faithfully", x + 12, cursorY + 10, { font: bold, size: 9 });
      drawWrappedText(`For ${model.company.legalName}`, x + 12, cursorY + 27, signoffWidth - 24, {
        font: bold,
        size: 8,
        lineHeight: 10,
      });
      drawTextLine(model.quotation.preparedBy || "Authorized Signatory", x + 12, cursorY + 55, { size: 8 });
      drawTextLine(model.company.phone, x + 12, cursorY + 69, { size: 8 });
      cursorY += 94;
      drawNote("Remarks", model.remarks);
    }

    function drawFooters(model) {
      pages.forEach((pdfPage, index) => {
        pdfPage.drawRectangle({
          x: 0,
          y: 0,
          width: PAGE_WIDTH,
          height: 30,
          color: color(COLORS.pale, pdfLib),
        });
        pdfPage.drawLine({
          start: { x: 0, y: 30 },
          end: { x: PAGE_WIDTH, y: 30 },
          thickness: 1.5,
          color: color(COLORS.green, pdfLib),
        });
        pdfPage.drawText(`Your Energy | ${model.company.website} | ${model.company.phone}`, {
          x: MARGIN,
          y: 11,
          size: 6.8,
          font: bold,
          color: color(COLORS.navy, pdfLib),
        });
        const pageText = `Page ${index + 1} of ${pages.length}`;
        const pageTextWidth = regular.widthOfTextAtSize(pageText, 6.8);
        pdfPage.drawText(pageText, {
          x: PAGE_WIDTH - MARGIN - pageTextWidth,
          y: 11,
          size: 6.8,
          font: regular,
          color: color(COLORS.muted, pdfLib),
        });
      });
    }

    return {
      addPage,
      drawBulletList,
      drawFirstPageHeader,
      drawFooters,
      drawKeyValueTable,
      drawNote,
      drawParagraph,
      drawSectionTitle,
      drawSignoff,
      drawTable,
    };
  }

  function validateModel(model) {
    if (!model?.company || !model?.quotation || !model?.summary) {
      throw new Error("The quotation data is incomplete.");
    }
    ["customerRows", "bomRows", "commercialRows", "paymentRows", "bankingRows", "scopeItems", "warrantyRows"].forEach(
      (key) => {
        if (!Array.isArray(model[key])) throw new Error(`The quotation data is missing ${key}.`);
      },
    );
  }

  async function generatePdfBytes({ model, pdfLib, fetchImpl = globalThis.fetch }) {
    validateModel(model);
    if (!pdfLib?.PDFDocument || !pdfLib?.StandardFonts) {
      throw new Error("The PDF generator did not load. Refresh the page and try again.");
    }

    const pdfDoc = await pdfLib.PDFDocument.create();
    const regular = await pdfDoc.embedFont(pdfLib.StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(pdfLib.StandardFonts.HelveticaBold);
    const logo = await embedLogo(pdfDoc, model.assets?.fullLogoSrc, fetchImpl);
    const renderer = createRenderer({ pdfDoc, pdfLib, regular, bold, logo });

    renderer.addPage(false);
    renderer.drawFirstPageHeader(model);

    renderer.drawSectionTitle("Customer & Project Details", 70);
    renderer.drawKeyValueTable(model.customerRows);
    renderer.drawParagraph(model.introduction);

    renderer.drawSectionTitle("Bill of Material", 72);
    renderer.drawTable(
      ["Sr.", "Technical Details", "Make", "Capacity", "Quantity"],
      model.bomRows,
      [31, 151, 127, 112, 98],
      { size: 7.2, lineHeight: 9.2, minimumHeight: 21 },
    );
    renderer.drawNote("Space Requirement", model.spaceRequirement);

    renderer.drawSectionTitle("Commercial Offer", 76);
    renderer.drawTable(["Sr.", "Description", "Amount / Details"], model.commercialRows, [36, 145, 338], {
      size: 7.8,
      lineHeight: 10,
      minimumHeight: 22,
    });
    renderer.drawNote("Note", model.subsidyNote);

    renderer.drawSectionTitle("Payment, Timeline & Validity", 76);
    renderer.drawTable(["Sr.", "Term", "Condition"], model.paymentRows, [36, 145, 338], {
      size: 7.8,
      lineHeight: 10,
      minimumHeight: 22,
    });

    renderer.drawSectionTitle("Banking Details", 70);
    renderer.drawKeyValueTable(model.bankingRows);

    renderer.drawSectionTitle("Client Scope", 58);
    renderer.drawBulletList(model.scopeItems);

    // Keep the complete legal section together on its own continuation page.
    renderer.drawSectionTitle("Warranty & General Terms", 300);
    renderer.drawTable(["Sr.", "Clause", "Details"], model.warrantyRows, [36, 145, 338], {
      size: 7.8,
      lineHeight: 10,
      minimumHeight: 22,
    });

    renderer.drawSectionTitle("Closing", 155);
    renderer.drawSignoff(model);
    renderer.drawFooters(model);

    pdfDoc.setTitle(`Solar Quotation - ${sanitizePdfText(model.summary.customer)}`);
    pdfDoc.setAuthor(model.company.legalName);
    pdfDoc.setSubject("Solar project quotation");
    pdfDoc.setCreator("Your Energy Quotation Builder");
    pdfDoc.setProducer("Your Energy");

    return pdfDoc.save({ useObjectStreams: true });
  }

  async function downloadPdf({ model, filename, pdfLib, documentRef = globalThis.document, urlApi = globalThis.URL }) {
    if (!documentRef?.body || !urlApi?.createObjectURL) {
      throw new Error("The browser download service is not available.");
    }

    const bytes = await generatePdfBytes({ model, pdfLib });
    const blob = new Blob([bytes], { type: "application/pdf" });
    const objectUrl = urlApi.createObjectURL(blob);
    const link = documentRef.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.hidden = true;
    documentRef.body.appendChild(link);

    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => urlApi.revokeObjectURL(objectUrl), 1000);
    }

    return filename;
  }

  return {
    buildFilename,
    downloadPdf,
    generatePdfBytes,
    sanitizeFilenamePart,
    sanitizePdfText,
    wrapText,
  };
});
