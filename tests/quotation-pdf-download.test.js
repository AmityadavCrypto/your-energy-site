const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildFilename,
  downloadHtml,
  getPdfOptions,
  sanitizeFilenamePart,
} = require("../quotation-pdf-download.js");

const root = path.resolve(__dirname, "..");

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

test("PDF options use A4, explicit download filename, and controlled page breaks", () => {
  const options = getPdfOptions("quotation.pdf");
  assert.equal(options.filename, "quotation.pdf");
  assert.equal(options.jsPDF.format, "a4");
  assert.equal(options.jsPDF.orientation, "portrait");
  assert.equal(options.html2canvas.scale, 2);
  assert.ok(options.pagebreak.avoid.includes("tr"));
});

test("download pipeline renders the quotation and calls html2pdf save", async () => {
  const calls = [];
  const quotationElement = { className: "quotation-document" };
  let hostRemoved = false;
  let stylesRemoved = false;
  const styleElement = {
    dataset: {},
    remove() {
      stylesRemoved = true;
    },
  };
  const stage = {
    appendChild() {},
    className: "",
    innerHTML: "",
    querySelector(selector) {
      return selector === ".quotation-document" ? quotationElement : null;
    },
    querySelectorAll() {
      return [];
    },
    style: {},
  };
  const host = {
    appendChild(element) {
      assert.equal(element, stage);
    },
    remove() {
      hostRemoved = true;
    },
    setAttribute() {},
    style: {},
  };
  const elements = [styleElement, host, stage];
  const documentRef = {
    body: {
      appendChild(element) {
        assert.equal(element, host);
      },
    },
    defaultView: {
      requestAnimationFrame(callback) {
        callback();
      },
    },
    fonts: null,
    head: {
      appendChild(element) {
        assert.equal(element, styleElement);
      },
    },
    createElement(tagName) {
      assert.ok(["style", "div"].includes(tagName));
      return elements.shift();
    },
  };
  const worker = {
    from(element) {
      calls.push(["from", element]);
      return this;
    },
    async save() {
      calls.push(["save"]);
    },
    set(options) {
      calls.push(["set", options]);
      return this;
    },
  };

  const filename = await downloadHtml({
    documentRef,
    filename: "quotation.pdf",
    html: '<article class="quotation-document">Quote</article>',
    html2pdfFactory: () => worker,
    styles: ".quotation-document { color: navy; }",
  });

  assert.equal(filename, "quotation.pdf");
  assert.equal(calls.some(([name]) => name === "save"), true);
  assert.equal(calls.find(([name]) => name === "from")[1], stage);
  assert.equal(stage.innerHTML, '<article class="quotation-document">Quote</article>');
  assert.equal(hostRemoved, true);
  assert.equal(stylesRemoved, true);
});

test("admin download button uses the PDF engine without opening a print tab", () => {
  const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");
  const adminJs = fs.readFileSync(path.join(root, "admin.js"), "utf8");
  const gstModeJs = fs.readFileSync(path.join(root, "admin-gst-mode.js"), "utf8");

  assert.match(adminHtml, /html2pdf\.bundle\.min\.js/);
  assert.match(adminHtml, /quotation-pdf-download\.js/);
  assert.ok(adminHtml.indexOf("html2pdf.bundle.min.js") < adminHtml.indexOf("quotation-pdf-download.js"));
  assert.match(adminJs, /pdfDownload\.downloadHtml/);
  assert.match(gstModeJs, /downloadQuotationFile\(lead, assets\)/);

  const activeDownloadOverride = gstModeJs.slice(
    gstModeJs.indexOf("printQuotation = async function"),
    gstModeJs.indexOf("buildQuotationPrintStyles = function"),
  );
  assert.doesNotMatch(activeDownloadOverride, /window\.open|\.print\(/);
});
