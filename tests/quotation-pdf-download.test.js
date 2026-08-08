const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildFilename,
  downloadPdf,
  generatePdfBytes,
  sanitizeFilenamePart,
  sanitizePdfText,
  wrapText,
} = require("../quotation-pdf-download.js");

let pdfLib = null;
try {
  pdfLib = require("pdf-lib");
} catch (_error) {
  // The production browser loads pdf-lib from a pinned CDN. Integration tests
  // run when the package is available in the local verification runtime.
}

const root = path.resolve(__dirname, "..");

function buildModel() {
  return {
    assets: {},
    company: {
      kicker: "Powered by FlyingApes Technologies Private Limited",
      legalName: "FLYINGAPES TECHNOLOGIES PRIVATE LIMITED",
      registeredOffice: "SGT Chandu Budhera Rd, Gurgaon - 122505, Haryana",
      branchOne: "White House, Shakti Vihar, Kotputli - 303108, Rajasthan",
      branchTwo: "Sanwali Circle, Sikar - 332021",
      gstin: "08AAGCF5791A1ZN",
      website: "www.yourenergy.co.in",
      phone: "+91 92618 69245",
    },
    quotation: {
      total: "Rs. 3,84,500",
      date: "08 August 2026",
      preparedBy: "Amit Kumar",
    },
    summary: {
      customer: "Test Customer",
      system: "10 kW On-Grid Rooftop Solar Power Plant",
      location: "Bhiwadi",
    },
    customerRows: [
      ["Customer Name", "Test Customer"],
      ["Phone Number", "9999999999"],
      ["Project Location", "Bhiwadi"],
      ["Project Type", "10 kW On-Grid Rooftop Solar Power Plant"],
      ["Monthly Electricity Bill", "9000"],
      ["Property Type", "Independent Home"],
    ],
    introduction: "We are pleased to submit our professional solar proposal.",
    bomRows: [
      ["1", "Solar Module", "Waaree", "550+ W", "19 Nos."],
      ["2", "Inverter", "Growatt", "10 kW, On-Grid", "1 Pc."],
      ["3", "Battery", "Luminous", "As specified", "As required"],
      ...Array.from({ length: 9 }, (_, index) => [
        String(index + 4),
        `Solar project component ${index + 4}`,
        "Standard approved make",
        "As required",
        "As required",
      ]),
    ],
    spaceRequirement: "The customer shall provide suitable shadow-free roof space.",
    commercialRows: [
      ["1", "GST Type", "Inclusive of GST"],
      ["2", "Subsidy", "Rs. 78,000"],
      ["3", "Final Quotation", "Rs. 3,84,500"],
      ["4", "DISCOM / Net Metering Charges", "Government charges are extra unless included in writing."],
    ],
    subsidyNote: "Subsidy is shown separately and is not deducted from the final quotation.",
    paymentRows: [
      ["1", "Payment Terms", "80% advance against work order. Balance before commissioning."],
      ["2", "Advance Required", "Rs. 3,00,000"],
      ["3", "Balance Payment", "Rs. 84,500"],
      ["4", "Project Completion", "20-30 days from approval and advance payment."],
      ["5", "Validity of Offer", "7 days from quotation date"],
      ["6", "Transportation", "Included up to the installation site."],
    ],
    bankingRows: [
      ["Name", "FlyingApes Technologies Private Limited"],
      ["Account number", "50200115046842"],
      ["IFSC Code", "HDFC0002128"],
    ],
    scopeItems: [
      "Cleaning of solar modules shall be in the client's scope.",
      "Roof access, electricity and water shall be provided by the client.",
      "Safe storage space shall be provided by the client.",
    ],
    warrantyRows: [
      ["1", "Complete System Warranty", "5 years complete system warranty"],
      ["2", "Solar Module Warranty", "25 years performance warranty"],
      ["3", "Inverter Warranty", "10 years as per manufacturer norms"],
      ["4", "Net Metering", "Government fees are payable as applicable."],
      ["5", "Force Majeure", "Timelines may change for events outside reasonable control."],
    ],
    closingText: "We hope this proposal is in line with your requirements.",
    remarks: "Final quotation is subject to site verification.",
  };
}

test("quotation filenames are safe, descriptive, and end in PDF", () => {
  assert.equal(sanitizeFilenamePart("Mr. Jagat / Bhiwadi"), "Mr-Jagat-Bhiwadi");
  assert.equal(
    buildFilename({
      projectName: "Shree Ganesh Industries",
      name: "Amit",
      quotation: { quotationDate: "2026-08-04" },
    }),
    "Your-Energy-Solar-Quotation-Shree-Ganesh-Industries-2026-08-04.pdf",
  );
});

test("PDF text normalization supports the built-in PDF fonts", () => {
  assert.equal(sanitizePdfText("Inclusive of GST – Rs. 3,84,500"), "Inclusive of GST - Rs. 3,84,500");
  const narrowFont = { widthOfTextAtSize: (value) => value.length * 5 };
  assert.deepEqual(wrapText("one two three", narrowFont, 10, 40), ["one two", "three"]);
});

test("vector renderer creates a valid, full-width multi-page A4 PDF", { skip: !pdfLib }, async () => {
  const bytes = await generatePdfBytes({ model: buildModel(), pdfLib });
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), "%PDF");

  const document = await pdfLib.PDFDocument.load(bytes);
  assert.ok(document.getPageCount() >= 2);
  document.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    assert.ok(Math.abs(width - 595.28) < 0.1);
    assert.ok(Math.abs(height - 841.89) < 0.1);
  });
});

test("download uses a hidden anchor and does not open a new tab", { skip: !pdfLib }, async () => {
  const events = [];
  const link = {
    click() {
      events.push("click");
    },
    remove() {
      events.push("remove");
    },
  };
  const documentRef = {
    body: {
      appendChild(element) {
        assert.equal(element, link);
        events.push("append");
      },
    },
    createElement(tagName) {
      assert.equal(tagName, "a");
      return link;
    },
  };
  const urlApi = {
    createObjectURL(blob) {
      assert.equal(blob.type, "application/pdf");
      events.push("create-url");
      return "blob:test-pdf";
    },
    revokeObjectURL() {},
  };

  const filename = await downloadPdf({
    documentRef,
    filename: "quotation.pdf",
    model: buildModel(),
    pdfLib,
    urlApi,
  });

  assert.equal(filename, "quotation.pdf");
  assert.equal(link.download, "quotation.pdf");
  assert.equal(link.href, "blob:test-pdf");
  assert.deepEqual(events, ["create-url", "append", "click", "remove"]);
});

test("admin loads pdf-lib before the deterministic quotation renderer", () => {
  const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");
  const adminJs = fs.readFileSync(path.join(root, "admin.js"), "utf8");
  const gstModeJs = fs.readFileSync(path.join(root, "admin-gst-mode.js"), "utf8");

  assert.match(adminHtml, /pdf-lib@1\.17\.1/);
  assert.doesNotMatch(adminHtml, /html2pdf/);
  assert.ok(adminHtml.indexOf("pdf-lib@1.17.1") < adminHtml.indexOf("quotation-pdf-download.js"));
  assert.match(adminJs, /pdfDownload\.downloadPdf/);
  assert.match(adminJs, /buildQuotationPdfModel/);
  assert.match(gstModeJs, /downloadQuotationFile\(lead, assets\)/);

  const activeDownloadOverride = gstModeJs.slice(
    gstModeJs.indexOf("printQuotation = async function"),
    gstModeJs.indexOf("buildQuotationPrintStyles = function"),
  );
  assert.doesNotMatch(activeDownloadOverride, /window\.open|\.print\(/);
});

test("quotation brands use free-text inputs and support an optional battery", () => {
  const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");
  const adminJs = fs.readFileSync(path.join(root, "admin.js"), "utf8");
  const gstModeJs = fs.readFileSync(path.join(root, "admin-gst-mode.js"), "utf8");

  assert.match(adminHtml, /<input type="text" name="solarPanelBrand"/);
  assert.match(adminHtml, /<input type="text" name="inverterBrand"/);
  assert.match(adminHtml, /<input type="text" name="batteryBrand"/);
  assert.doesNotMatch(adminHtml, /<select name="(?:solarPanelBrand|inverterBrand|batteryBrand)"/);
  assert.match(adminJs, /function buildQuotationBomRows/);
  assert.match(adminJs, /\["Battery", String\(quote\.batteryBrand\)\.trim\(\)/);
  assert.match(gstModeJs, /buildQuotationBomRows\(quote/);
});

test("quotation uses the fixed HDFC company banking details", () => {
  const adminJs = fs.readFileSync(path.join(root, "admin.js"), "utf8");
  assert.match(adminJs, /FlyingApes Technologies Private Limited/);
  assert.match(adminJs, /50200115046842/);
  assert.match(adminJs, /HDFC0002128/);
  assert.match(adminJs, /08AAGCF5791A1ZN/);
  assert.doesNotMatch(adminJs, /7201002100001497|PUNB0720100/);
});
