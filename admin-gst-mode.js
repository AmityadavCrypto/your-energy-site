const GST_MODE_DEFAULT = "Exclusive of GST";
const GST_MODE_INCLUSIVE = "Inclusive of GST";
const GST_PERCENT = 13.8;

function normalizeGstMode(value) {
  return value === GST_MODE_INCLUSIVE ? GST_MODE_INCLUSIVE : GST_MODE_DEFAULT;
}

function buildYourEnergyLogoSvg(className = "quotation-logo-svg") {
  return `
    <svg class="${className}" viewBox="0 0 1400 599" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Your Energy">
      <text x="98" y="338" fill="#08203F" font-size="322" font-weight="800" font-family="Avenir Next Condensed, Avenir Next, Montserrat, Arial Black, sans-serif" letter-spacing="4">Y</text>
      <circle cx="610" cy="196" r="138" stroke="#08203F" stroke-width="86" stroke-dasharray="770 90" stroke-dashoffset="45" transform="rotate(-90 610 196)"/>
      <rect x="567" y="36" width="86" height="216" rx="43" fill="#76C300"/>
      <text x="742" y="338" fill="#08203F" font-size="322" font-weight="800" font-family="Avenir Next Condensed, Avenir Next, Montserrat, Arial Black, sans-serif" letter-spacing="10">U</text>
      <text x="1008" y="338" fill="#08203F" font-size="322" font-weight="800" font-family="Avenir Next Condensed, Avenir Next, Montserrat, Arial Black, sans-serif" letter-spacing="4">R</text>
      <text x="218" y="474" fill="#76C300" font-size="108" font-weight="700" font-family="Montserrat, Avenir Next, Arial, sans-serif" letter-spacing="44">ENERGY</text>
      <line x1="180" y1="535" x2="332" y2="535" stroke="#76C300" stroke-width="6"/>
      <line x1="1164" y1="535" x2="1316" y2="535" stroke="#76C300" stroke-width="6"/>
      <text x="397" y="558" fill="#4D6582" font-size="56" font-weight="500" font-family="Montserrat, Avenir Next, Arial, sans-serif" letter-spacing="8">POWERING YOUR FUTURE</text>
    </svg>
  `;
}

function ensureGstModeField() {
  const form = document.querySelector("[data-quotation-form]");
  if (!form) return null;

  const existingSelect = form.querySelector('[name="gstMode"]');
  if (existingSelect) return existingSelect;

  const legacyInput = form.querySelector('[name="gstPercent"]');
  if (!legacyInput) return null;

  const field = legacyInput.closest(".field");
  if (!field) return null;

  const label = field.querySelector("span");
  if (label) label.textContent = "GST";

  const select = document.createElement("select");
  select.name = "gstMode";

  [GST_MODE_DEFAULT, GST_MODE_INCLUSIVE].forEach((optionLabel) => {
    const option = document.createElement("option");
    option.value = optionLabel;
    option.textContent = optionLabel;
    select.appendChild(option);
  });

  select.value = GST_MODE_DEFAULT;
  legacyInput.replaceWith(select);
  return select;
}

const originalGetQuotationDefaults = getQuotationDefaults;
getQuotationDefaults = function getQuotationDefaultsWithGstMode(lead) {
  const defaults = typeof originalGetQuotationDefaults === "function" ? originalGetQuotationDefaults(lead) : {};
  const savedMode = lead?.quotation?.gstMode || defaults.gstMode;

  return {
    ...defaults,
    gstPercent: GST_PERCENT,
    gstMode: normalizeGstMode(savedMode),
  };
};

calculateQuotation = function calculateQuotationWithGstMode(quote) {
  const legacySubtotal =
    numberValue(quote.systemCost) +
    numberValue(quote.inverterCost) +
    numberValue(quote.structureCost) +
    numberValue(quote.wiringCost) +
    numberValue(quote.installationCost) +
    numberValue(quote.netMeteringCost) +
    numberValue(quote.miscCost);
  const enteredProjectCost = numberValue(quote.projectCost) || legacySubtotal;
  const gstMode = normalizeGstMode(quote.gstMode);
  const gstRate = GST_PERCENT / 100;
  const subtotal = gstMode === GST_MODE_INCLUSIVE ? enteredProjectCost / (1 + gstRate) : enteredProjectCost;
  const gst = gstMode === GST_MODE_INCLUSIVE ? enteredProjectCost - subtotal : subtotal * gstRate;
  const discount = numberValue(quote.discount);
  const total = gstMode === GST_MODE_INCLUSIVE ? enteredProjectCost : subtotal + gst;
  const advance = numberValue(quote.advanceRequired);

  return {
    gstMode,
    gstPercent: GST_PERCENT,
    subtotal,
    gst,
    discount,
    total: Math.max(0, total),
    payableAfterSubsidy: Math.max(0, total - discount),
    advance,
    balance: Math.max(0, total - advance),
  };
};

renderQuotationPreview = function renderQuotationPreviewWithGstMode(lead) {
  const preview = document.querySelector("[data-quotation-preview]");
  if (!preview) return;

  const { quote, totals } = getQuotationWithTotals(lead);
  preview.innerHTML = `
    <div class="quote-preview-head">
      <div>
        <span>Quotation Preview</span>
        <strong>${escapeHtml(lead.name || "Customer")}</strong>
      </div>
      <strong>${formatCurrency(totals.total)}</strong>
    </div>
    <div class="quote-preview-grid">
      <span>Panel Brand</span><strong>${escapeHtml(quote.solarPanelBrand)}</strong>
      <span>Inverter Brand</span><strong>${escapeHtml(quote.inverterBrand)}</strong>
      <span>System Size</span><strong>${escapeHtml(quote.systemSize || "-")} kW</strong>
      <span>System Type</span><strong>${escapeHtml(quote.systemType)}</strong>
      <span>GST Mode</span><strong>${escapeHtml(totals.gstMode)}</strong>
      <span>Subsidy</span><strong>${formatCurrency(totals.discount)}</strong>
      <span>Balance</span><strong>${formatCurrency(totals.balance)}</strong>
    </div>
  `;
};

buildQuotationDocumentHtml = function buildQuotationDocumentHtmlWithGstMode(lead) {
  const { quote, totals } = getQuotationWithTotals(lead);
  const systemSize = quote.systemSize || Number.parseFloat(String(lead.estimatedSystem || "").replace(/[^\d.]/g, "")) || "-";
  const projectType = `${systemSize} kW ${quote.systemType || "Solar"} Rooftop Solar Power Plant`;
  const panelCapacity = quote.panelWattage ? `${quote.panelWattage}+ W` : "-";
  const panelQuantity = quote.panelQuantity ? `${quote.panelQuantity} Nos.` : "-";
  const inverterCapacity = quote.inverterCapacity ? `${quote.inverterCapacity} kW` : "-";
  const quotationDate = formatQuotationDate(quote.quotationDate);

  const customerRows = [
    ["Customer Name", lead.name || "-"],
    ["Phone Number", lead.phone || "-"],
    ["Project Location", lead.city || "-"],
    ["Project Type", projectType],
    ["Monthly Electricity Bill", lead.monthlyBill || "-"],
    ["Property Type", lead.propertyType || "-"],
  ];

  const bomRows = [
    ["1", "Solar Module", quote.solarPanelBrand || "-", panelCapacity, panelQuantity],
    ["2", "Inverter", quote.inverterBrand || "-", `${inverterCapacity}, ${quote.systemType || "-"}`, "1 Pc."],
    ["3", "Energy Meter", quote.energyMeter || "HPL / Secure or equivalent", "As per DISCOM requirement", "As required"],
    ["4", "DC Cable", quote.dcCable || "Polycab / equivalent", "1C x 4 sq. mm", "As required"],
    ["5", "AC Cable", quote.acCable || "Standard copper cable", "As per load requirement", "As required"],
    ["6", "Earthing Set with Lightning Arrester", quote.earthingSet || "Standard", "Set", "As required"],
    ["7", "Earthing Wire", quote.earthingWire || "Standard 4 mm", "Set", "As required"],
    ["8", "DCDB & ACDB", quote.dcdbAcdb || "Standard", "Set", "As required"],
    ["9", "Balance of System", quote.balanceOfSystem || "MC4 connectors, lugs, nut bolts and other items", "Set", "As required"],
    ["10", "Installation & Commissioning", quote.installationScope || "FLYINGAPES TECHNOLOGIES PRIVATE LIMITED", "Set", "As required"],
    ["11", "Mounting Structure", quote.structureType || "Standard", "Set", "As required"],
  ];

  const commercialRows = [
    ["1", "GST Type", totals.gstMode],
    ["2", "Subsidy", formatCurrency(totals.discount)],
    ["3", "Final Quotation", formatCurrency(totals.total)],
    ["4", "DISCOM / Net Metering Charges", "Government / DISCOM charges are extra unless specifically included in writing."],
  ];

  const termRows = [
    ["1", "Payment Terms", quote.paymentTerms],
    ["2", "Advance Required", formatCurrency(totals.advance)],
    ["3", "Balance Payment", formatCurrency(totals.balance)],
    ["4", "Project Completion", quote.completionTimeline],
    ["5", "Validity of Offer", `${quote.validityDays || "-"} days from quotation date`],
    ["6", "Transportation", "Transportation of the above-mentioned material up to the installation site is included."],
  ];

  const scopeItems = [
    "Cleaning of solar modules shall be in the client's scope.",
    "Roof access, electricity and water shall be provided by the client during construction.",
    "Safe storage space for solar material shall be provided by the client.",
    "Electrical connection space in the LT panel shall be provided for inverter output synchronization.",
    "Internet connection shall be provided by the client for remote monitoring, if applicable.",
  ];

  const warrantyRows = [
    ["1", "Complete System Warranty", quote.systemWarranty],
    ["2", "Solar Module Warranty", quote.moduleWarranty],
    ["3", "Inverter Warranty", quote.inverterWarranty],
    ["4", "Net Metering", "Government / DISCOM fees, file charges, demand, stamp, testing and net metering charges are payable as applicable."],
    ["5", "Force Majeure", "Work timelines may change due to war, fire, flood, epidemic, government action, law, act of God, DISCOM delay, or other events outside reasonable control."],
  ];

  return `
    <article class="quotation-document">
      <header class="quotation-masthead">
        <div class="brand-block">
          <div class="quotation-logo">
            ${buildYourEnergyLogoSvg("quotation-logo-svg quotation-logo-svg--primary")}
          </div>
          <div>
            <span class="brand-kicker">Powered by FLYINGAPES TECHNOLOGIES PRIVATE LIMITED</span>
            <h1>Solar Project Quotation</h1>
            <p>Registered Office: SGT Chandu Budhera Rd, Near by Labour Chowk, Garhi Harsaru, Gurgaon - 122505, Haryana</p>
            <p>Corporate Office: White house, shakti vihar, kotputli-303108, Rajasthan</p>
            <p>Phone: +91 92618 69245</p>
          </div>
        </div>
        <div class="quotation-title-block">
          <div class="quotation-card-logo">
            ${buildYourEnergyLogoSvg("quotation-logo-svg quotation-logo-svg--card")}
          </div>
          <span>Final Quotation</span>
          <strong>${formatCurrency(totals.total)}</strong>
          <p>Date: ${escapeHtml(quotationDate)}</p>
          <p>Prepared By: ${escapeHtml(quote.preparedBy || "-")}</p>
        </div>
      </header>

      <section class="quote-hero-strip">
        <div>
          <span>Customer</span>
          <strong>${escapeHtml(lead.name || "-")}</strong>
        </div>
        <div>
          <span>System</span>
          <strong>${escapeHtml(projectType)}</strong>
        </div>
        <div>
          <span>Location</span>
          <strong>${escapeHtml(lead.city || "-")}</strong>
        </div>
      </section>

      <section class="quote-section">
        <h2>Customer & Project Details</h2>
        <table class="kv-table"><tbody>${buildRows(customerRows)}</tbody></table>
        <p class="intro-copy">Dear Sir, with reference to our discussion, we are pleased to submit our professional proposal for the above rooftop solar power plant.</p>
      </section>

      <section class="quote-section">
        <h2>Bill of Material</h2>
        <table class="data-table">
          <thead><tr><th>Sr.</th><th>Technical Details</th><th>Make</th><th>Capacity</th><th>Quantity</th></tr></thead>
          <tbody>${buildDataRows(bomRows)}</tbody>
        </table>
        <div class="quote-note"><strong>Space Requirement:</strong> The customer shall provide shadow-free roof space suitable for solar module installation and safe access for installation activity.</div>
      </section>

      <section class="quote-section page-break-before">
        <h2>Commercial Offer</h2>
        <table class="data-table compact-table">
          <thead><tr><th>Sr.</th><th>Description</th><th>Amount / Details</th></tr></thead>
          <tbody>${buildDataRows(commercialRows)}</tbody>
        </table>
        <div class="quote-note"><strong>Note:</strong> Subsidy is shown separately for reference and is not deducted from the final quotation amount.</div>
      </section>

      <section class="quote-section">
        <h2>Payment, Timeline & Validity</h2>
        <table class="data-table compact-table">
          <thead><tr><th>Sr.</th><th>Term</th><th>Condition</th></tr></thead>
          <tbody>${buildDataRows(termRows)}</tbody>
        </table>
      </section>

      <section class="quote-section">
        <h2>Client Scope</h2>
        <ul class="scope-list">${scopeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>

      <section class="quote-section">
        <h2>Warranty & General Terms</h2>
        <table class="data-table compact-table">
          <thead><tr><th>Sr.</th><th>Clause</th><th>Details</th></tr></thead>
          <tbody>${buildDataRows(warrantyRows)}</tbody>
        </table>
      </section>

      <section class="quote-section closing-section">
        <h2>Closing</h2>
        <p>We hope the above proposal is in line with your requirements. If you require any further information, please feel free to contact us.</p>
        <div class="closing-signoff">
          <strong>Yours Faithfully</strong>
          <p>For FLYINGAPES TECHNOLOGIES PRIVATE LIMITED</p>
          <p>${escapeHtml(quote.preparedBy || "Authorized Signatory")}</p>
          <p>+91 92618 69245</p>
        </div>
        <div class="quote-note"><strong>Remarks:</strong> ${escapeHtml(quote.remarks || "Final quotation is subject to site verification and approval requirements.")}</div>
      </section>

      <footer class="quotation-footer">
        <span>Your Energy</span>
        <span>FLYINGAPES TECHNOLOGIES PRIVATE LIMITED | SGT Chandu Budhera Rd, Near by Labour Chowk, Garhi Harsaru, Gurgaon - 122505, Haryana | White house, shakti vihar, kotputli-303108, Rajasthan | +91 92618 69245</span>
      </footer>
    </article>
  `;
};

async function waitForPrintWindowAssets(printWindow) {
  if (!printWindow) return;

  const imagePromises = Array.from(printWindow.document.images || []).map(
    (image) =>
      new Promise((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      }),
  );

  await Promise.all(imagePromises);

  if (printWindow.document.fonts?.ready) {
    await printWindow.document.fonts.ready;
  }

  await new Promise((resolve) => {
    if (typeof printWindow.requestAnimationFrame === "function") {
      printWindow.requestAnimationFrame(() => {
        printWindow.requestAnimationFrame(resolve);
      });
      return;
    }
    setTimeout(resolve, 250);
  });
}

printQuotation = async function printQuotationWithAssetWait() {
  const lead = await saveQuotation();
  if (!lead) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("Please allow popups to generate the quotation PDF.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Solar Quotation - ${escapeHtml(lead.name || "Customer")}</title>
        <style>${buildQuotationPrintStyles()}</style>
      </head>
      <body>${buildQuotationDocumentHtml(lead)}</body>
    </html>
  `);
  printWindow.document.close();

  await waitForPrintWindowAssets(printWindow);
  printWindow.focus();
  printWindow.print();
};

buildQuotationPrintStyles = function buildQuotationPrintStylesWithGstMode() {
  return `
    @page { size: A4; margin: 14mm; }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      background: #edf4e8;
      color: #0b2242;
      font-family: Calibri, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.35;
    }
    .quotation-document {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
      border: 1px solid #d8e6ce;
      box-shadow: 0 24px 70px rgba(8, 32, 63, 0.16);
      overflow: hidden;
    }
    .quotation-masthead {
      display: grid;
      grid-template-columns: 1.35fr 0.65fr;
      gap: 22px;
      align-items: stretch;
      padding: 18mm 18mm 12mm;
      background:
        linear-gradient(135deg, #ffffff 0%, #f7fbf3 48%, #edf7e4 100%);
      border-bottom: 4px solid #76c300;
    }
    .brand-block {
      display: grid;
      grid-template-columns: 145px 1fr;
      gap: 18px;
      align-items: center;
    }
    .quotation-logo {
      width: 145px;
      display: flex;
      align-items: center;
    }
    .quotation-logo-svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .quotation-logo-svg--primary {
      min-width: 145px;
    }
    .brand-kicker {
      display: inline-block;
      margin-bottom: 8px;
      color: #5ea900;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .brand-block h1 {
      margin: 0 0 8px;
      color: #08203f;
      font-size: 28px;
      line-height: 1.05;
    }
    .brand-block p,
    .quotation-title-block p,
    .intro-copy,
    .closing-section p {
      margin: 4px 0;
    }
    .quotation-title-block {
      display: grid;
      align-content: space-between;
      min-height: 166px;
      padding: 16px;
      border-radius: 18px;
      background: linear-gradient(145deg, #eef5ff 0%, #f9fcff 45%, #eef8df 100%);
      color: #526982;
      text-align: right;
      border: 1px solid #d5e4d6;
      box-shadow: 0 14px 34px rgba(8, 32, 63, 0.08);
    }
    .quotation-card-logo {
      width: 132px;
      justify-self: end;
    }
    .quotation-logo-svg--card {
      width: 100%;
    }
    .quotation-title-block span {
      display: block;
      color: #5ea900;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .quotation-title-block strong {
      display: block;
      margin: 8px 0;
      color: #08203f;
      font-size: 27px;
      line-height: 1.05;
    }
    .quote-hero-strip {
      display: grid;
      grid-template-columns: 1fr 1.35fr 1fr;
      gap: 1px;
      margin: 0;
      padding: 0 18mm;
      background: #d8e6ce;
    }
    .quote-hero-strip div {
      padding: 12px 14px;
      background: #f6faf2;
    }
    .quote-hero-strip span {
      display: block;
      color: #5d6b80;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .quote-hero-strip strong {
      display: block;
      margin-top: 4px;
      color: #08203f;
      font-size: 12px;
    }
    .quote-section {
      margin: 18px 18mm 0;
      break-inside: avoid;
    }
    .quote-section h2 {
      margin: 0 0 10px;
      color: #08203f;
      font-size: 15px;
      padding: 8px 11px;
      border-left: 5px solid #76c300;
      background: #f1f7eb;
      border-radius: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 8px;
    }
    th,
    td {
      border: 1px solid #b7c7ad;
      padding: 8.5px 10px;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }
    th {
      background: #e6f1dd;
      color: #08203f;
      font-weight: 700;
      text-align: left;
    }
    .kv-table th { width: 28%; }
    .data-table th,
    .data-table td { font-size: 10.4pt; }
    .data-table th:first-child,
    .data-table td:first-child { width: 8%; text-align: center; }
    .data-table th:nth-child(2),
    .data-table td:nth-child(2) { width: 34%; }
    .data-table th:nth-child(3),
    .data-table td:nth-child(3) { width: 23%; }
    .data-table th:nth-child(4),
    .data-table td:nth-child(4) { width: 18%; }
    .data-table th:nth-child(5),
    .data-table td:nth-child(5) { width: 17%; }
    .compact-table th:first-child,
    .compact-table td:first-child { width: 8%; }
    .compact-table th:nth-child(2),
    .compact-table td:nth-child(2) { width: 27%; }
    .compact-table th:nth-child(3),
    .compact-table td:nth-child(3) { width: 65%; }
    .quote-note {
      margin-top: 10px;
      padding: 11px 13px;
      border: 1px solid #d7e4ce;
      border-radius: 10px;
      background: #f8fbf5;
    }
    .scope-list {
      margin: 8px 0 0;
      padding-left: 20px;
    }
    .scope-list li {
      margin: 5px 0;
    }
    .closing-signoff {
      width: 44%;
      min-width: 230px;
      margin: 14px 0 0 auto;
      padding: 16px;
      border: 1px solid #d7e4ce;
      border-radius: 14px;
      background: linear-gradient(145deg, #f9fbf6 0%, #eef5ff 100%);
      text-align: right;
    }
    .quotation-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 18px;
      padding: 13px 18mm;
      background: linear-gradient(135deg, #f7fbf3 0%, #edf5ff 55%, #f9fcff 100%);
      border-top: 2px solid #76c300;
      color: #08203f;
      font-size: 9.2pt;
    }
    .quotation-footer span:first-child {
      color: #5ea900;
      font-weight: 800;
    }
    @media print {
      body { background: #ffffff; }
      .quotation-document {
        max-width: none;
        margin: 0;
        border: none;
        box-shadow: none;
      }
      .quotation-masthead { padding: 0 0 10mm; }
      .quote-hero-strip { padding: 0; }
      .quote-section { margin-left: 0; margin-right: 0; }
      .quotation-footer { padding-left: 0; padding-right: 0; }
      .page-break-before { break-before: page; }
    }
  `;
};

document.addEventListener("DOMContentLoaded", () => {
  ensureGstModeField();
});
