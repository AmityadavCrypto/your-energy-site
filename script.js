const WHATSAPP_NUMBER = "919261869245";
const LEAD_STORAGE_KEY = "yourEnergyAssessmentLeads";

async function syncLeadToBackend(lead) {
  try {
    const response = await fetch("/.netlify/functions/lead-upsert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lead: {
          ...lead,
          clientLeadId: lead.id,
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Lead backend did not accept the request.");
    }

    return {
      ok: true,
      id: payload.id || lead.id,
      clientLeadId: payload.clientLeadId || lead.id,
    };
  } catch (error) {
    console.warn("Lead saved locally, but backend sync failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Lead backend did not accept the request.",
    };
  }
}

function setSyncStatus(element, message, state) {
  if (!element) return;

  element.hidden = !message;
  element.textContent = message || "";

  if (message && state) {
    element.dataset.state = state;
  } else {
    delete element.dataset.state;
  }
}

function setButtonLoading(button, isLoading, loadingLabel) {
  if (!button) return;

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingLabel : button.dataset.defaultLabel;
}

function setupMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const panel = document.querySelector("[data-nav-panel]");

  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  panel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      panel.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function buildEstimateWhatsappMessage(formData, estimate, source) {
  const rows = [
    ["Source", source || "Solar Estimate"],
    ["Customer Type", formData.get("customerType") || ""],
    ["Property Type", formData.get("propertyType") || ""],
    ["Monthly Electricity Bill", formData.get("monthlyBill") || ""],
    ["City / State", formData.get("city") || ""],
    ["Name", formData.get("name") || ""],
    ["Phone", formData.get("phone") || ""],
    ["Estimated System", estimate.system],
    ["Indicative Roof Area", estimate.roof],
    ["Estimated Monthly Savings", estimate.monthly],
    ["Indicative Investment", estimate.investment],
  ];

  return `Hello Your Energy,\n\nI calculated my solar estimate on the website and want a final quote.\n\n${rows
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n")}\n\nEstimate Note: ${estimate.note}`;
}

function readAssessmentLeads() {
  try {
    const leads = JSON.parse(localStorage.getItem(LEAD_STORAGE_KEY) || "[]");
    return Array.isArray(leads) ? leads : [];
  } catch {
    return [];
  }
}

function writeAssessmentLeads(leads) {
  localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(leads));
}

function createLeadId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function saveAssessmentLead(formData, estimate, status, leadId) {
  const leads = readAssessmentLeads();
  const now = new Date().toISOString();
  const id = leadId || createLeadId();
  const lead = {
    id,
    createdAt: now,
    updatedAt: now,
    status,
    customerType: formData.get("customerType") || "",
    propertyType: formData.get("propertyType") || "",
    monthlyBill: formData.get("monthlyBill") || "",
    city: formData.get("city") || "",
    name: formData.get("name") || "",
    phone: formData.get("phone") || "",
    estimatedSystem: estimate.system,
    roofArea: estimate.roof,
    monthlySavings: estimate.monthly,
    investment: estimate.investment,
    note: estimate.note,
    applicationStatus: "Application Applied",
    documents: {},
    quotation: {},
  };
  const existingIndex = leads.findIndex((item) => item.id === id);

  if (existingIndex >= 0) {
    leads[existingIndex] = {
      ...leads[existingIndex],
      ...lead,
      createdAt: leads[existingIndex].createdAt || now,
      applicationStatus: leads[existingIndex].applicationStatus || lead.applicationStatus,
      documents: leads[existingIndex].documents || lead.documents,
      quotation: leads[existingIndex].quotation || lead.quotation,
    };
  } else {
    leads.unshift(lead);
  }

  writeAssessmentLeads(leads);

  return {
    leadId: id,
    syncResult: await syncLeadToBackend(existingIndex >= 0 ? leads[existingIndex] : lead),
  };
}

function formatCurrency(value) {
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

function calculateSolarEstimate({ customerType, propertyType, monthlyBill, city }) {
  const bill = Number(monthlyBill);
  const isCommercial = customerType === "Commercial";
  const tariff = isCommercial ? 10.8 : 7.4;
  const solarYield = city.toLowerCase().includes("gujarat") ? 130 : 122;
  const consumption = bill / tariff;
  const baseSize = consumption / solarYield;
  const systemSize = Math.max(isCommercial ? 5 : 1.5, Math.round(baseSize * 10) / 10);
  const areaFactor = propertyType.toLowerCase().includes("warehouse") ? 75 : 90;
  const roofArea = Math.round(systemSize * areaFactor);
  const monthlySavings = bill * (isCommercial ? 0.8 : 0.74);
  const minCost = systemSize * (isCommercial ? 47000 : 56000);
  const maxCost = systemSize * (isCommercial ? 62000 : 72000);

  return {
    system: `${systemSize} kW`,
    roof: `${roofArea} sq ft`,
    monthly: formatCurrency(monthlySavings),
    investment: `${formatCurrency(minCost)} - ${formatCurrency(maxCost)}`,
    note: isCommercial
      ? "Commercial estimates improve further after load profiling, operating-hour review, and roof-access planning."
      : "Residential estimates improve further after roof direction, shade, and subsidy eligibility are confirmed.",
  };
}

function getEstimateFromForm(form) {
  const formData = new FormData(form);
  const estimate = calculateSolarEstimate({
    customerType: formData.get("customerType") || "",
    propertyType: formData.get("propertyType") || "",
    monthlyBill: formData.get("monthlyBill") || "0",
    city: formData.get("city") || "",
  });

  return { formData, estimate };
}

function updateEstimateResult(result, estimate) {
  result.querySelector('[data-result="system"]').textContent = estimate.system;
  result.querySelector('[data-result="roof"]').textContent = estimate.roof;
  result.querySelector('[data-result="monthly"]').textContent = estimate.monthly;
  result.querySelector('[data-result="investment"]').textContent = estimate.investment;
  result.querySelector('[data-result="note"]').textContent = estimate.note;
  result.classList.add("is-visible");
}

function setupAssessmentFlow() {
  document.querySelectorAll("[data-calc-form]").forEach((form) => {
    const container = form.closest(".hero-form-card");
    const result = container ? container.querySelector("[data-calc-result]") : null;
    const finalQuote = container ? container.querySelector("[data-final-quote]") : null;
    const syncStatus = container ? container.querySelector("[data-sync-status]") : null;
    const submitButton = form.querySelector('button[type="submit"]');
    let latestEstimate = null;
    let latestFormData = null;
    let latestLeadId = null;

    if (!result) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const { formData, estimate } = getEstimateFromForm(form);
      latestEstimate = estimate;
      latestFormData = formData;
      updateEstimateResult(result, estimate);
      setButtonLoading(submitButton, true, "Saving Estimate...");
      setSyncStatus(syncStatus, "Saving your estimate details...", "pending");

      const { leadId, syncResult } = await saveAssessmentLead(formData, estimate, "Estimate Viewed", latestLeadId);
      latestLeadId = leadId;
      setButtonLoading(submitButton, false);

      if (syncResult.ok) {
        setSyncStatus(syncStatus, "Estimate ready. Your details are saved for the final quote step.", "success");
      } else {
        setSyncStatus(
          syncStatus,
          "Estimate ready. We saved your details in this browser, but live dashboard sync needs attention.",
          "warning",
        );
      }
    });

    if (finalQuote) {
      finalQuote.addEventListener("click", async () => {
        if (!form.reportValidity()) return;

        const { formData, estimate } = getEstimateFromForm(form);
        latestEstimate = estimate;
        latestFormData = formData;
        updateEstimateResult(result, estimate);
        setButtonLoading(finalQuote, true, "Saving and Opening WhatsApp...");
        setSyncStatus(syncStatus, "Saving your quote request before opening WhatsApp...", "pending");

        const { leadId, syncResult } = await saveAssessmentLead(
          formData,
          estimate,
          "WhatsApp Quote Requested",
          latestLeadId,
        );
        latestLeadId = leadId;

        const text = encodeURIComponent(
          buildEstimateWhatsappMessage(latestFormData, latestEstimate, "Free Solar Assessment"),
        );
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;

        if (syncResult.ok) {
          setSyncStatus(syncStatus, "Quote request saved. Opening WhatsApp now...", "success");
        } else {
          setSyncStatus(
            syncStatus,
            "Opening WhatsApp now. Your request was saved in this browser, but the live dashboard sync needs checking.",
            "warning",
          );
        }

        window.setTimeout(() => {
          setButtonLoading(finalQuote, false);
          window.location.href = whatsappUrl;
        }, 1100);
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupMobileMenu();
  setupAssessmentFlow();
});
