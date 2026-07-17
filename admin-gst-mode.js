const GST_MODE_DEFAULT = "Exclusive of GST";
const GST_MODE_INCLUSIVE = "Inclusive of GST";
const GST_PERCENT = 13.8;

function normalizeGstMode(value) {
  return value === GST_MODE_INCLUSIVE ? GST_MODE_INCLUSIVE : GST_MODE_DEFAULT;
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
  const totalBeforeDiscount = gstMode === GST_MODE_INCLUSIVE ? enteredProjectCost : subtotal + gst;
  const total = Math.max(0, totalBeforeDiscount - discount);
  const advance = numberValue(quote.advanceRequired);

  return {
    gstMode,
    gstPercent: GST_PERCENT,
    subtotal,
    gst,
    discount,
    total,
    advance,
    balance: Math.max(0, total - advance),
  };
};

document.addEventListener("DOMContentLoaded", () => {
  ensureGstModeField();
});
