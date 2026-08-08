const LEAD_STORAGE_KEY = "yourEnergyAssessmentLeads";
const WHATSAPP_COUNTRY_CODE = "91";
const MAX_DOCUMENT_SIZE = 1.5 * 1024 * 1024;
const COMPANY_BANKING_DETAILS = Object.freeze({
  name: "FlyingApes Technologies Private Limited",
  accountNumber: "50200115046842",
  ifscCode: "HDFC0002128",
  summary: "Name: FlyingApes Technologies Private Limited, Account number: 50200115046842, IFSC Code: HDFC0002128",
});

const APPLICATION_STATUSES = [
  "Application Applied",
  "Payment Received / Loan Passed",
  "Electricity Board Approval",
  "Installation At Site Done",
  "Subsidy Received",
  "Project Completed",
];

const DOCUMENT_TYPES = [
  ["aadhaarCard", "Aadhaar Card Image"],
  ["panCard", "PAN Card Image"],
  ["bankPassbook", "Bank Passbook Image"],
  ["electricityBill", "Electricity Bill Image"],
  ["miscellaneous", "Miscellaneous Image"],
];

const EDITABLE_LEAD_FIELDS = [
  "leadSource",
  "status",
  "applicationStatus",
  "name",
  "phone",
  "projectName",
  "contactRole",
  "decisionStage",
  "customerType",
  "propertyType",
  "monthlyBill",
  "city",
  "estimatedSystem",
  "roofArea",
  "monthlySavings",
  "investment",
  "note",
];

const CSV_COLUMNS = [
  ["createdAt", "Date"],
  ["status", "Lead Status"],
  ["applicationStatus", "Application Status"],
  ["leadSource", "Offering"],
  ["projectName", "Business / Society"],
  ["contactRole", "Contact Role"],
  ["decisionStage", "Decision Stage"],
  ["name", "Contact Name"],
  ["phone", "Phone"],
  ["customerType", "Customer Type"],
  ["propertyType", "Property Type"],
  ["monthlyBill", "Monthly Bill"],
  ["city", "City / State"],
  ["estimatedSystem", "Estimated System"],
  ["roofArea", "Roof Area"],
  ["monthlySavings", "Monthly Savings"],
  ["investment", "Investment"],
  ["note", "Estimate Note"],
];

const DOCUMENT_BUCKET = "lead-documents";
const SUPABASE_PLACEHOLDER = "YOUR_PROJECT_ID";
const ADMIN_LEAD_UTILS = window.YourEnergyAdminLeadUtils;
const ADMIN_LEAD_REPOSITORY = window.YourEnergyAdminLeadRepository;

if (!ADMIN_LEAD_UTILS || !ADMIN_LEAD_REPOSITORY) {
  throw new Error("Admin lead management modules failed to load.");
}

let selectedLeadId = null;
let editingLeadId = null;
let supabaseClient = null;
let isRemoteMode = false;
let isAdminSignedIn = false;
let leadCache = [];
let adminToastTimer = null;
let leadViewState = {
  search: "",
  offering: "all",
  applicationStatus: "all",
  sort: "newest",
};

function getSupabaseConfig() {
  const config = window.YourEnergySupabaseConfig || {};
  return {
    url: String(config.url || "").trim(),
    anonKey: String(config.anonKey || "").trim(),
  };
}

function hasSupabaseConfig() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && !url.includes(SUPABASE_PLACEHOLDER));
}

function setAdminStorageNote(title, message) {
  setText("[data-admin-storage-title]", title);
  setText("[data-admin-storage-message]", message);
}

function setAdminAppVisibility(isVisible) {
  document.querySelectorAll("[data-admin-app]").forEach((element) => {
    element.hidden = !isVisible;
  });
}

function setLoginVisibility(isVisible) {
  const loginPanel = document.querySelector("[data-admin-login]");
  if (loginPanel) loginPanel.hidden = !isVisible;
}

function setLoginStatus(message) {
  setText("[data-admin-login-status]", message || "");
}

function setAdminSetupVisibility(isVisible) {
  const panel = document.querySelector("[data-admin-setup]");
  if (panel) panel.hidden = !isVisible;
}

function setSignOutVisibility(isVisible) {
  const button = document.querySelector("[data-admin-sign-out]");
  if (button) button.hidden = !isVisible;
}

function dbRowToLead(row) {
  return normalizeLead({
    id: row.id,
    clientLeadId: row.client_lead_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    applicationStatus: row.application_status,
    leadSource: row.lead_source,
    projectName: row.project_name,
    contactRole: row.contact_role,
    decisionStage: row.decision_stage,
    customerType: row.customer_type,
    propertyType: row.property_type,
    monthlyBill: row.monthly_bill,
    city: row.city,
    name: row.name,
    phone: row.phone,
    estimatedSystem: row.estimated_system,
    roofArea: row.roof_area,
    monthlySavings: row.monthly_savings,
    investment: row.investment,
    note: row.note,
    documents: row.documents || {},
    quotation: row.quotation || {},
  });
}

function leadToDbPatch(lead) {
  return {
    status: lead.status || "Estimate Viewed",
    application_status: lead.applicationStatus || "Application Applied",
    lead_source: lead.leadSource || "",
    project_name: lead.projectName || "",
    contact_role: lead.contactRole || "",
    decision_stage: lead.decisionStage || "",
    customer_type: lead.customerType || "",
    property_type: lead.propertyType || "",
    monthly_bill: lead.monthlyBill || "",
    city: lead.city || "",
    name: lead.name || "",
    phone: lead.phone || "",
    estimated_system: lead.estimatedSystem || "",
    roof_area: lead.roofArea || "",
    monthly_savings: lead.monthlySavings || "",
    investment: lead.investment || "",
    note: lead.note || "",
    documents: lead.documents || {},
    quotation: lead.quotation || {},
  };
}

function leadToLegacyDbPatch(lead) {
  const { lead_source, project_name, contact_role, decision_stage, ...legacyPatch } = leadToDbPatch(lead);
  return legacyPatch;
}

function isMissingMetadataColumnError(error) {
  const message = String(error?.message || "").toLowerCase();
  const mentionsMetadata = ["lead_source", "project_name", "contact_role", "decision_stage"].some((column) =>
    message.includes(column),
  );
  return mentionsMetadata && (message.includes("column") || message.includes("schema cache"));
}

function readLeads() {
  if (isRemoteMode) {
    return leadCache.map(normalizeLead);
  }

  try {
    const leads = JSON.parse(localStorage.getItem(LEAD_STORAGE_KEY) || "[]");
    return Array.isArray(leads) ? leads.map(normalizeLead) : [];
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  if (isRemoteMode) {
    leadCache = leads.map(normalizeLead);
    return;
  }

  localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(leads));
}

function tryWriteLeads(leads) {
  try {
    writeLeads(leads);
    return true;
  } catch (error) {
    window.alert("This browser could not save the change. Try uploading smaller images or removing older documents.");
    return false;
  }
}

function readLegacyNoteValue(note, label) {
  const text = String(note || "");
  const marker = `${label}:`;
  const markerIndex = text.toLowerCase().indexOf(marker.toLowerCase());
  if (markerIndex < 0) return "";

  const valueStart = markerIndex + marker.length;
  const remainder = text.slice(valueStart);
  const separatorIndex = remainder.indexOf(";");
  const value = separatorIndex >= 0 ? remainder.slice(0, separatorIndex) : remainder;
  return value.trim().replace(/[.\s]+$/, "");
}

function getLeadSource(lead, projectName) {
  const source = String(lead.leadSource || "").trim().toLowerCase();
  if (source.includes("housing") || source.includes("society")) return "Housing Society";
  if (source.includes("commercial") || source.includes("business")) return "Commercial";
  if (source) return "Homes";
  if (lead.propertyType === "Apartment Society" && projectName) return "Housing Society";
  if (lead.customerType === "Commercial" && projectName) return "Commercial";
  return "Homes";
}

function normalizeLead(lead) {
  const projectName = String(lead.projectName || readLegacyNoteValue(lead.note, "Project")).trim();

  return {
    ...lead,
    leadSource: getLeadSource(lead, projectName),
    projectName,
    contactRole: String(lead.contactRole || readLegacyNoteValue(lead.note, "Contact role")).trim(),
    decisionStage: String(lead.decisionStage || readLegacyNoteValue(lead.note, "Decision stage")).trim(),
    applicationStatus: lead.applicationStatus || "Application Applied",
    documents: lead.documents || {},
    quotation: lead.quotation || {},
  };
}

async function fetchRemoteLeads() {
  if (!supabaseClient || !isAdminSignedIn) return [];

  try {
    const { data, error } = await supabaseClient
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      window.alert(`Could not load leads from Supabase: ${error.message}`);
      return readLeads();
    }

    leadCache = (data || []).map(dbRowToLead);
    return leadCache;
  } catch (error) {
    window.alert(`Could not connect to Supabase: ${error.message || "Unknown network error"}`);
    return readLeads();
  }
}

async function updateLead(leadId, updater) {
  const leads = readLeads();
  const index = leads.findIndex((lead) => lead.id === leadId);
  if (index < 0) return null;

  const updatedLead = normalizeLead(updater({ ...leads[index] }));
  updatedLead.updatedAt = new Date().toISOString();
  leads[index] = updatedLead;

  if (isRemoteMode) {
    try {
      let result = await supabaseClient
        .from("leads")
        .update(leadToDbPatch(updatedLead))
        .eq("id", leadId)
        .select()
        .single();

      if (result.error && isMissingMetadataColumnError(result.error)) {
        result = await supabaseClient
          .from("leads")
          .update(leadToLegacyDbPatch(updatedLead))
          .eq("id", leadId)
          .select()
          .single();
      }

      const { data, error } = result;

      if (error) {
        window.alert(`Could not save this lead to Supabase: ${error.message}`);
        return null;
      }

      const savedLead = dbRowToLead(data);
      leadCache[index] = savedLead;
      return savedLead;
    } catch (error) {
      window.alert(`Could not connect to Supabase: ${error.message || "Unknown network error"}`);
      return null;
    }
  }

  return tryWriteLeads(leads) ? updatedLead : null;
}

function getSelectedLead() {
  return readLeads().find((lead) => lead.id === selectedLeadId) || null;
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value) {
  const number = Number(value) || 0;
  return `Rs. ${Math.round(number).toLocaleString("en-IN")}`;
}

function numberValue(value) {
  return Number(value) || 0;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function showAdminToast(message, tone = "success") {
  const region = document.querySelector("[data-admin-toast-region]");
  if (!region) return;

  window.clearTimeout(adminToastTimer);
  region.innerHTML = `<div class="admin-toast admin-toast-${escapeHtml(tone)}">${escapeHtml(message)}</div>`;
  adminToastTimer = window.setTimeout(() => {
    region.innerHTML = "";
  }, 4200);
}

function setButtonBusy(button, isBusy, busyText = "Working...") {
  if (!button) return;

  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
  delete button.dataset.originalText;
}

function getVisibleLeads(leads = readLeads()) {
  return ADMIN_LEAD_UTILS.filterAndSortLeads(leads, leadViewState);
}

function renderStats(leads) {
  const quoteRequests = leads.filter((lead) => lead.status === "WhatsApp Quote Requested").length;
  const residential = leads.filter((lead) => lead.customerType === "Residential").length;
  const commercial = leads.filter((lead) => lead.customerType === "Commercial").length;

  setText('[data-stat="total"]', leads.length);
  setText('[data-stat="quoteRequests"]', quoteRequests);
  setText('[data-stat="residential"]', residential);
  setText('[data-stat="commercial"]', commercial);
}

function renderRows(leads, totalLeadCount) {
  const rows = document.querySelector("[data-lead-rows]");
  const emptyState = document.querySelector("[data-empty-state]");
  if (!rows || !emptyState) return;

  rows.innerHTML = leads
    .map(
      (lead) => `
        <tr>
          <td>${escapeHtml(formatDate(lead.createdAt))}</td>
          <td><span class="status-pill">${escapeHtml(lead.applicationStatus)}</span></td>
          <td>${escapeHtml(lead.leadSource || "-")}</td>
          <td>${escapeHtml(lead.projectName || "-")}</td>
          <td>${escapeHtml(lead.name || "-")}</td>
          <td>${escapeHtml(lead.phone || "-")}</td>
          <td>${escapeHtml(lead.propertyType || "-")}</td>
          <td>${escapeHtml(lead.monthlyBill || "-")}</td>
          <td>${escapeHtml(lead.city || "-")}</td>
          <td>${escapeHtml(lead.estimatedSystem || "-")}</td>
          <td>${escapeHtml(lead.monthlySavings || "-")}</td>
          <td>${escapeHtml(lead.investment || "-")}</td>
          <td>
            <div class="admin-row-actions">
              <button class="mini-action" type="button" data-open-lead="${escapeHtml(lead.id)}">Open</button>
              <button class="mini-action" type="button" data-edit-lead="${escapeHtml(lead.id)}">Edit</button>
              <button class="mini-action mini-action-danger" type="button" data-delete-lead="${escapeHtml(lead.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  emptyState.hidden = leads.length > 0;
  const emptyTitle = emptyState.querySelector("strong");
  const emptyMessage = emptyState.querySelector("span");
  if (!leads.length && totalLeadCount > 0) {
    if (emptyTitle) emptyTitle.textContent = "No leads match these filters";
    if (emptyMessage) emptyMessage.textContent = "Change or reset the search and filters to see other records.";
  } else {
    if (emptyTitle) emptyTitle.textContent = "No assessment leads yet";
    if (emptyMessage) {
      emptyMessage.textContent =
        "Submit the Free Solar Assessment form on the website, then return here to see the saved entry.";
    }
  }
}

function renderFilterSummary(visibleCount, totalCount) {
  const summary = document.querySelector("[data-filter-summary]");
  if (!summary) return;

  if (visibleCount === totalCount) {
    summary.textContent = `Showing all ${totalCount} lead${totalCount === 1 ? "" : "s"}.`;
    return;
  }

  summary.textContent = `Showing ${visibleCount} of ${totalCount} leads.`;
}

function syncLeadViewState() {
  leadViewState = {
    search: String(document.querySelector("[data-lead-search]")?.value || ""),
    offering: String(document.querySelector("[data-lead-offering]")?.value || "all"),
    applicationStatus: String(document.querySelector("[data-lead-stage-filter]")?.value || "all"),
    sort: String(document.querySelector("[data-lead-sort]")?.value || "newest"),
  };
  renderLeads();
}

function resetLeadViewState() {
  leadViewState = {
    search: "",
    offering: "all",
    applicationStatus: "all",
    sort: "newest",
  };
  window.setTimeout(renderLeads, 0);
}

function renderLastUpdated(leads) {
  const newest = leads[0];
  const text = newest
    ? `Last updated ${formatDate(newest.updatedAt || newest.createdAt)}`
    : "No records saved yet.";

  setText("[data-last-updated]", text);
}

function renderLeads() {
  const leads = readLeads();
  const visibleLeads = getVisibleLeads(leads);
  renderStats(leads);
  renderRows(visibleLeads, leads.length);
  renderFilterSummary(visibleLeads.length, leads.length);
  renderLastUpdated(leads);

  if (selectedLeadId) {
    const selectedLead = getSelectedLead();
    if (selectedLead) renderLeadDetail(selectedLead, false);
  }
}

function renderLeadDetail(lead, shouldScroll = true) {
  const panel = document.querySelector("[data-lead-detail]");
  if (!panel) return;

  selectedLeadId = lead.id;
  panel.hidden = false;
  setText("[data-detail-title]", lead.projectName || lead.name || "Unnamed Lead");
  setText(
    "[data-detail-subtitle]",
    `${lead.projectName ? `Contact: ${lead.name || "Not provided"} - ` : ""}${lead.phone || "No phone"} - ${lead.city || "No city"} - ${formatDate(lead.createdAt)}`,
  );

  renderDetailSummary(lead);
  renderStatusControls(lead);
  renderLeadContactActions(lead);
  renderDocumentGrid(lead);
  populateQuotationForm(lead);
  renderQuotationPreview(lead);
  if (shouldScroll) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDetailSummary(lead) {
  const summary = document.querySelector("[data-detail-summary]");
  if (!summary) return;

  const rows = [
    ["Lead Status", lead.status],
    ["Offering", lead.leadSource],
    ["Business / Society", lead.projectName],
    ["Contact Person", lead.name],
    ["Contact Role", lead.contactRole],
    ["Decision Stage", lead.decisionStage],
    ["Customer Type", lead.customerType],
    ["Property Type", lead.propertyType],
    ["Monthly Bill", lead.monthlyBill],
    ["City / State", lead.city],
    ["Estimated System", lead.estimatedSystem],
    ["Estimated Savings", lead.monthlySavings],
    ["Investment Range", lead.investment],
    ["Estimate Note", lead.note],
    ["Created", formatDate(lead.createdAt)],
    ["Last Updated", formatDate(lead.updatedAt || lead.createdAt)],
  ];

  summary.innerHTML = rows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "-")}</dd></div>`)
    .join("");
}

function renderLeadContactActions(lead) {
  const callLink = document.querySelector("[data-lead-call]");
  const whatsappLink = document.querySelector("[data-lead-whatsapp]");
  const phone = String(lead.phone || "").trim();
  const whatsappPhone = normalizePhoneNumber(phone);

  if (callLink) {
    callLink.hidden = !phone;
    callLink.href = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "#";
  }

  if (whatsappLink) {
    whatsappLink.hidden = !whatsappPhone;
    whatsappLink.href = whatsappPhone
      ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hello ${lead.name || ""}, this is Your Energy regarding your solar enquiry.`)}`
      : "#";
  }
}

function renderStatusControls(lead) {
  const statusSelect = document.querySelector("[data-application-status]");
  const timeline = document.querySelector("[data-status-timeline]");
  if (!statusSelect || !timeline) return;

  statusSelect.value = lead.applicationStatus;
  const activeIndex = Math.max(0, APPLICATION_STATUSES.indexOf(lead.applicationStatus));
  timeline.innerHTML = APPLICATION_STATUSES.map(
    (status, index) => `
      <div class="timeline-step ${index <= activeIndex ? "is-active" : ""}">
        <span>${index + 1}</span>
        <strong>${escapeHtml(status)}</strong>
      </div>
    `,
  ).join("");
}

function renderDocumentGrid(lead) {
  const grid = document.querySelector("[data-document-grid]");
  if (!grid) return;

  grid.innerHTML = DOCUMENT_TYPES.map(([key, label]) => {
    const documentItem = lead.documents[key];
    const hasRemotePath = Boolean(documentItem?.path && !documentItem?.dataUrl);
    const preview = documentItem
      ? hasRemotePath
        ? `<div class="document-placeholder">Stored securely</div>`
        : `<img src="${documentItem.dataUrl}" alt="${escapeHtml(label)} preview">`
      : `<div class="document-placeholder">No image added</div>`;
    const actions = documentItem
      ? `
        ${
          hasRemotePath
            ? `<button class="mini-action" type="button" data-download-document="${key}">Download</button>`
            : `<a class="mini-action" href="${documentItem.dataUrl}" download="${escapeHtml(documentItem.name)}">Download</a>`
        }
        <button class="mini-action mini-action-danger" type="button" data-remove-document="${key}">Remove</button>
      `
      : "";

    return `
      <article class="document-card">
        <div class="document-preview">${preview}</div>
        <div class="document-body">
          <strong>${escapeHtml(label)}</strong>
          <span>${documentItem ? escapeHtml(documentItem.name) : "Upload JPG, PNG, or WebP image"}</span>
          <label class="mini-action document-upload">
            Upload
            <input type="file" accept="image/*" data-document-input="${key}">
          </label>
          <div class="document-actions">${actions}</div>
        </div>
      </article>
    `;
  }).join("");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function safeFileName(name) {
  return String(name || "document")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadRemoteDocument(lead, key, file) {
  const path = `${lead.id}/${key}-${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabaseClient.storage.from(DOCUMENT_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (uploadError) {
    window.alert(`Could not upload document: ${uploadError.message}`);
    return null;
  }

  return updateLead(lead.id, (draft) => ({
    ...draft,
    documents: {
      ...draft.documents,
      [key]: {
        name: file.name,
        type: file.type,
        size: file.size,
        bucket: DOCUMENT_BUCKET,
        path,
        updatedAt: new Date().toISOString(),
      },
    },
  }));
}

async function handleDocumentUpload(input) {
  const lead = getSelectedLead();
  const file = input.files && input.files[0];
  const key = input.dataset.documentInput;
  if (!lead || !file || !key) return;

  if (!isRemoteMode && file.size > MAX_DOCUMENT_SIZE) {
    window.alert("Please upload an image below 1.5 MB for this local admin version.");
    input.value = "";
    return;
  }

  if (isRemoteMode) {
    const updatedLead = await uploadRemoteDocument(lead, key, file);
    input.value = "";
    if (updatedLead) renderLeads();
    return;
  }

  const dataUrl = await fileToDataUrl(file);
  const updatedLead = await updateLead(lead.id, (draft) => ({
    ...draft,
    documents: {
      ...draft.documents,
      [key]: {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        updatedAt: new Date().toISOString(),
      },
    },
  }));

  if (updatedLead) renderLeads();
}

async function downloadRemoteDocument(key) {
  const lead = getSelectedLead();
  const documentItem = lead?.documents?.[key];
  if (!documentItem) return;

  if (documentItem.dataUrl) {
    window.open(documentItem.dataUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const { data, error } = await supabaseClient.storage.from(DOCUMENT_BUCKET).createSignedUrl(documentItem.path, 60 * 10);
  if (error) {
    window.alert(`Could not open document: ${error.message}`);
    return;
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

async function removeDocument(key) {
  const lead = getSelectedLead();
  if (!lead || !key) return;
  const documentItem = lead.documents[key];

  if (isRemoteMode && documentItem?.path) {
    await supabaseClient.storage.from(DOCUMENT_BUCKET).remove([documentItem.path]);
  }

  const updatedLead = await updateLead(lead.id, (draft) => {
    const documents = { ...draft.documents };
    delete documents[key];
    return { ...draft, documents };
  });

  if (updatedLead) renderLeads();
}

function clearEditLeadErrors() {
  document.querySelectorAll("[data-edit-error]").forEach((element) => {
    element.textContent = "";
  });
  document.querySelectorAll("[data-edit-lead-form] [aria-invalid='true']").forEach((element) => {
    element.removeAttribute("aria-invalid");
  });
  setText("[data-edit-lead-status]", "");
}

function setEditFormValue(form, fieldName, value) {
  const control = form.elements.namedItem(fieldName);
  if (!control) return;

  const nextValue = String(value ?? "");
  if (control.tagName === "SELECT" && nextValue && !Array.from(control.options).some((option) => option.value === nextValue)) {
    control.add(new Option(nextValue, nextValue));
  }
  control.value = nextValue;
}

function openEditLead(lead) {
  const dialog = document.querySelector("[data-edit-lead-dialog]");
  const form = document.querySelector("[data-edit-lead-form]");
  if (!dialog || !form || !lead) return;

  editingLeadId = lead.id;
  clearEditLeadErrors();
  EDITABLE_LEAD_FIELDS.forEach((fieldName) => setEditFormValue(form, fieldName, lead[fieldName]));

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }

  window.requestAnimationFrame(() => form.elements.namedItem("name")?.focus());
}

function closeEditLeadDialog() {
  const dialog = document.querySelector("[data-edit-lead-dialog]");
  editingLeadId = null;
  clearEditLeadErrors();

  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function renderEditLeadErrors(errors) {
  Object.entries(errors).forEach(([fieldName, message]) => {
    const errorElement = document.querySelector(`[data-edit-error="${fieldName}"]`);
    const control = document.querySelector(`[data-edit-lead-form] [name="${fieldName}"]`);
    if (errorElement) errorElement.textContent = message;
    if (control) control.setAttribute("aria-invalid", "true");
  });

  const firstInvalidControl = document.querySelector("[data-edit-lead-form] [aria-invalid='true']");
  firstInvalidControl?.focus();
}

async function handleEditLeadSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const saveButton = form.querySelector("[data-save-lead-changes]");
  const lead = readLeads().find((item) => item.id === editingLeadId);
  if (!lead) {
    setText("[data-edit-lead-status]", "This lead is no longer available. Refresh the dashboard and try again.");
    return;
  }

  clearEditLeadErrors();
  const formData = new FormData(form);
  const draftValues = Object.fromEntries(
    EDITABLE_LEAD_FIELDS.map((fieldName) => [fieldName, String(formData.get(fieldName) || "").trim()]),
  );
  const validation = ADMIN_LEAD_UTILS.validateLeadInput(draftValues);

  if (!validation.isValid) {
    renderEditLeadErrors(validation.errors);
    setText("[data-edit-lead-status]", "Please correct the highlighted fields.");
    return;
  }

  let updatedLead = null;
  setButtonBusy(saveButton, true, "Saving...");
  try {
    updatedLead = await updateLead(lead.id, (currentLead) => ({
      ...currentLead,
      ...validation.value,
    }));
  } finally {
    setButtonBusy(saveButton, false);
  }

  if (!updatedLead) {
    setText("[data-edit-lead-status]", "The lead could not be saved. Please try again.");
    return;
  }

  selectedLeadId = updatedLead.id;
  closeEditLeadDialog();
  renderLeads();
  showAdminToast("Lead details updated successfully.");
}

async function deleteLead(leadId, triggerButton = null) {
  const leads = readLeads();
  const lead = leads.find((item) => item.id === leadId);
  if (!lead) {
    showAdminToast("This lead is no longer available.", "error");
    return false;
  }

  const leadLabel = lead.projectName || lead.name || "this lead";
  const shouldDelete = window.confirm(
    `Permanently delete ${leadLabel}? This removes the lead and its uploaded documents. This action cannot be undone.`,
  );
  if (!shouldDelete) return false;

  setButtonBusy(triggerButton, true, "Deleting...");
  let cleanupWarning = "";

  try {
    if (isRemoteMode) {
      if (!supabaseClient || !isAdminSignedIn) {
        throw new Error("Your admin session has expired. Sign in again before deleting a lead.");
      }

      const documentPaths = ADMIN_LEAD_UTILS.getDocumentPaths(lead);
      const deletion = await ADMIN_LEAD_REPOSITORY.deleteRemoteLead(supabaseClient, {
        leadId,
        bucket: DOCUMENT_BUCKET,
        documentPaths,
      });
      leadCache = ADMIN_LEAD_UTILS.removeLeadById(leadCache, leadId);
      if (deletion.cleanupError) {
        cleanupWarning = " The lead was deleted, but some stored documents may need manual cleanup.";
      }
    } else {
      const remainingLeads = ADMIN_LEAD_UTILS.removeLeadById(leads, leadId);
      if (!tryWriteLeads(remainingLeads)) return false;
    }

    if (editingLeadId === leadId) closeEditLeadDialog();
    if (selectedLeadId === leadId) closeDetailPanel();
    renderLeads();
    showAdminToast(`Lead deleted successfully.${cleanupWarning}`, cleanupWarning ? "warning" : "success");
    return true;
  } catch (error) {
    window.alert(`Could not delete this lead: ${error.message}`);
    return false;
  } finally {
    setButtonBusy(triggerButton, false);
  }
}

function getQuotationDefaults(lead) {
  const estimateSize = Number.parseFloat(String(lead.estimatedSystem || "").replace(/[^\d.]/g, "")) || "";
  const today = new Date().toISOString().slice(0, 10);

  return {
    quotationDate: today,
    preparedBy: "Tarun Jangir",
    solarPanelBrand: "Waaree",
    inverterBrand: "Growatt",
    systemType: "On-Grid",
    panelTechnology: "Mono PERC",
    systemSize: estimateSize,
    panelWattage: 550,
    panelQuantity: estimateSize ? Math.ceil((estimateSize * 1000) / 550) : "",
    inverterCapacity: estimateSize,
    structureType: "GI Structure",
    energyMeter: "HPL / Secure, 1 Phase, as required",
    dcCable: "Polycab, 1C x 4 sq. mm, as required",
    acCable: "Standard copper cable, as required",
    earthingSet: "Standard set with lightning arrester, as required",
    earthingWire: "Standard 4 mm earthing wire, as required",
    dcdbAcdb: "Standard DCDB & ACDB set, as required",
    balanceOfSystem: "MC4 connectors, lugs, nut bolts and other items",
    installationScope: "Installation and commissioning as required",
    projectCost: "",
    gstPercent: 13.8,
    discount: "",
    advanceRequired: "",
    validityDays: 7,
    paymentTerms: "80% advance against work order. Balance payment before commissioning / handover.",
    completionTimeline: "20-30 days from approval, commercially clear order and advance payment.",
    systemWarranty: "5 years complete system warranty",
    moduleWarranty: "25 years solar module performance warranty",
    inverterWarranty: "10 years inverter warranty as per manufacturer norms",
    bankDetails: COMPANY_BANKING_DETAILS.summary,
    remarks: "Final pricing may change after site verification, shadow analysis, and approval requirements.",
  };
}

function populateQuotationForm(lead) {
  const form = document.querySelector("[data-quotation-form]");
  if (!form) return;

  const values = {
    ...getQuotationDefaults(lead),
    ...lead.quotation,
    bankDetails: COMPANY_BANKING_DETAILS.summary,
  };
  Array.from(form.elements).forEach((field) => {
    if (!field.name || field.type === "button") return;
    field.value = values[field.name] ?? "";
  });
}

function collectQuotationData() {
  const form = document.querySelector("[data-quotation-form]");
  if (!form) return {};

  const formData = new FormData(form);
  return {
    ...Object.fromEntries(formData.entries()),
    bankDetails: COMPANY_BANKING_DETAILS.summary,
  };
}

function calculateQuotation(quote) {
  const legacySubtotal =
    numberValue(quote.systemCost) +
    numberValue(quote.inverterCost) +
    numberValue(quote.structureCost) +
    numberValue(quote.wiringCost) +
    numberValue(quote.installationCost) +
    numberValue(quote.netMeteringCost) +
    numberValue(quote.miscCost);
  const subtotal = numberValue(quote.projectCost) || legacySubtotal;
  const gst = subtotal * (numberValue(quote.gstPercent) / 100);
  const discount = numberValue(quote.discount);
  const total = Math.max(0, subtotal + gst - discount);
  const advance = numberValue(quote.advanceRequired);

  return {
    subtotal,
    gst,
    discount,
    total,
    advance,
    balance: Math.max(0, total - advance),
  };
}

function getQuotationWithTotals(lead) {
  const quote = { ...getQuotationDefaults(lead), ...lead.quotation, ...collectQuotationData() };
  return { quote, totals: calculateQuotation(quote) };
}

function renderQuotationPreview(lead) {
  const preview = document.querySelector("[data-quotation-preview]");
  if (!preview) return;

  const { quote, totals } = getQuotationWithTotals(lead);
  preview.innerHTML = `
    <div class="quote-preview-head">
      <div>
        <span>Quotation Preview</span>
        <strong>${escapeHtml(lead.projectName || lead.name || "Customer")}</strong>
      </div>
      <strong>${formatCurrency(totals.total)}</strong>
    </div>
    <div class="quote-preview-grid">
      <span>Panel Brand</span><strong>${escapeHtml(quote.solarPanelBrand)}</strong>
      <span>Inverter Brand</span><strong>${escapeHtml(quote.inverterBrand)}</strong>
      <span>System Size</span><strong>${escapeHtml(quote.systemSize || "-")} kW</strong>
      <span>System Type</span><strong>${escapeHtml(quote.systemType)}</strong>
      <span>GST</span><strong>${formatCurrency(totals.gst)}</strong>
      <span>Balance</span><strong>${formatCurrency(totals.balance)}</strong>
    </div>
  `;
}

async function saveQuotation() {
  const lead = getSelectedLead();
  if (!lead) return null;

  const quotation = collectQuotationData();
  const totals = calculateQuotation(quotation);
  const updatedLead = await updateLead(lead.id, (draft) => ({
    ...draft,
    quotation: {
      ...quotation,
      subtotal: totals.subtotal,
      gst: totals.gst,
      total: totals.total,
      balance: totals.balance,
      savedAt: new Date().toISOString(),
    },
  }));

  if (updatedLead) {
    renderLeads();
    renderQuotationPreview(updatedLead);
  }

  return updatedLead;
}

function formatQuotationDate(value) {
  if (!value) return formatDate(new Date().toISOString());

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function buildRows(rows) {
  return rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "-")}</td></tr>`).join("");
}

function buildDataRows(rows) {
  return rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value || "-")}</td>`).join("")}</tr>`).join("");
}

function getAssetUrl(path) {
  return new URL(path, window.location.href).href;
}

function buildQuotationDocumentHtml(lead) {
  const { quote, totals } = getQuotationWithTotals(lead);
  const systemSize = quote.systemSize || Number.parseFloat(String(lead.estimatedSystem || "").replace(/[^\d.]/g, "")) || "-";
  const projectType = `${systemSize} kW ${quote.systemType || "Solar"} Rooftop Solar Power Plant`;
  const panelCapacity = quote.panelWattage ? `${quote.panelWattage}+ W` : "-";
  const panelQuantity = quote.panelQuantity ? `${quote.panelQuantity} Nos.` : "-";
  const inverterCapacity = quote.inverterCapacity ? `${quote.inverterCapacity} kW` : "-";
  const quotationDate = formatQuotationDate(quote.quotationDate);
  const logoUrl = getAssetUrl("assets/logo-your-energy-web.png");
  const markUrl = getAssetUrl("assets/your-energy-mark.png");

  const customerRows = [
    ["Contact Name", lead.name || "-"],
    ...(lead.projectName ? [["Business / Society", lead.projectName]] : []),
    ["Phone Number", lead.phone || "-"],
    ["Project Location", lead.city || "-"],
    ["Project Type", projectType],
    ["Monthly Electricity Bill", lead.monthlyBill || "-"],
    ["Property Type", lead.propertyType || "-"],
  ];

  const bomRows = [
    ["1", "Solar Module", quote.solarPanelBrand || "-", panelCapacity, panelQuantity],
    ["2", "Hybrid Inverter", quote.inverterBrand || "-", `${inverterCapacity}, ${quote.systemType || "-"}`, "1 Pc."],
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
    ["1", "Project Cost", formatCurrency(totals.subtotal)],
    ["2", `GST (${quote.gstPercent || 0}%)`, formatCurrency(totals.gst)],
    ["3", "Subsidy / Discount", formatCurrency(totals.discount)],
    ["4", "Final Quotation", formatCurrency(totals.total)],
    ["5", "DISCOM / Net Metering Charges", "Government / DISCOM charges are extra unless specifically included in writing."],
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
          <img class="quotation-logo" src="${logoUrl}" alt="Your Energy">
          <div>
            <span class="brand-kicker">Powered by FLYINGAPES TECHNOLOGIES PRIVATE LIMITED</span>
            <h1>Solar Project Quotation</h1>
            <p>Registered Office: SGT Chandu Budhera Rd, Near by Labour Chowk, Garhi Harsaru, Gurgaon - 122505, Haryana</p>
            <p>Branch 1: White House, Shakti Vihar, Kotputli - 303108, Rajasthan</p>
            <p>Branch 2: Sanwali Circle, Sikar - 332021</p>
            <p>Phone: +91 92618 69245</p>
          </div>
        </div>
        <div class="quotation-title-block">
          <img src="${markUrl}" alt="" aria-hidden="true">
          <span>Final Quotation</span>
          <strong>${formatCurrency(totals.total)}</strong>
          <p>Date: ${escapeHtml(quotationDate)}</p>
          <p>Prepared By: ${escapeHtml(quote.preparedBy || "-")}</p>
        </div>
      </header>

      <section class="quote-hero-strip">
        <div>
          <span>Customer</span>
          <strong>${escapeHtml(lead.projectName || lead.name || "-")}</strong>
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
        <div class="closing-grid">
          <div>
            <strong>Banking Details</strong>
            <p><strong>Name:</strong> ${escapeHtml(COMPANY_BANKING_DETAILS.name)}</p>
            <p><strong>Account number:</strong> ${escapeHtml(COMPANY_BANKING_DETAILS.accountNumber)}</p>
            <p><strong>IFSC Code:</strong> ${escapeHtml(COMPANY_BANKING_DETAILS.ifscCode)}</p>
          </div>
          <div>
            <strong>Yours Faithfully</strong>
            <p>For FLYINGAPES TECHNOLOGIES PRIVATE LIMITED</p>
            <p>${escapeHtml(quote.preparedBy || "Authorized Signatory")}</p>
            <p>+91 92618 69245</p>
          </div>
        </div>
        <div class="quote-note"><strong>Remarks:</strong> ${escapeHtml(quote.remarks || "Final quotation is subject to site verification and approval requirements.")}</div>
      </section>

      <footer class="quotation-footer">
        <span>Your Energy</span>
        <span>FLYINGAPES TECHNOLOGIES PRIVATE LIMITED | Registered Office: SGT Chandu Budhera Rd, Near by Labour Chowk, Garhi Harsaru, Gurgaon - 122505, Haryana | Branch 1: White House, Shakti Vihar, Kotputli - 303108, Rajasthan | Branch 2: Sanwali Circle, Sikar - 332021 | +91 92618 69245</span>
      </footer>
    </article>
  `;
}

function buildQuotationPrintStyles() {
  return `
    @page { size: A4; margin: 14mm; }
    .quotation-pdf-stage,
    .quotation-pdf-stage * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .quotation-pdf-stage {
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
      height: auto;
      display: block;
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
      background: #08203f;
      color: rgba(238, 245, 255, 0.78);
      text-align: right;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }
    .quotation-title-block img {
      width: 42px;
      height: 42px;
      object-fit: contain;
      justify-self: end;
    }
    .quotation-title-block span {
      display: block;
      color: #bde86d;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .quotation-title-block strong {
      display: block;
      margin: 8px 0;
      color: #ffffff;
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
    .quotation-pdf-stage table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 8px;
    }
    .quotation-pdf-stage th,
    .quotation-pdf-stage td {
      border: 1px solid #b7c7ad;
      padding: 8.5px 10px;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }
    .quotation-pdf-stage th {
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
    .closing-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 12px;
    }
    .closing-grid div {
      min-height: 120px;
      padding: 13px;
      border: 1px solid #d7e4ce;
      border-radius: 10px;
      background: #f9fbf6;
    }
    .closing-grid div:last-child {
      text-align: right;
    }
    .quotation-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 18px;
      padding: 11px 18mm;
      background: #071223;
      color: rgba(238, 245, 255, 0.76);
      font-size: 9.2pt;
    }
    .quotation-footer span:first-child {
      color: #bde86d;
      font-weight: 800;
    }
    @media print {
      .quotation-pdf-stage { background: #ffffff; }
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
}

async function downloadQuotationFile(lead, assets = {}) {
  const pdfDownload = window.QuotationPdfDownload;
  if (!pdfDownload) {
    throw new Error("The PDF generator did not load. Refresh the page and try again.");
  }

  const customerName = lead.projectName || lead.name || "Customer";
  return pdfDownload.downloadHtml({
    documentRef: document,
    filename: pdfDownload.buildFilename(lead),
    html: buildQuotationDocumentHtml(lead, assets),
    html2pdfFactory: window.html2pdf,
    styles: buildQuotationPrintStyles(),
    title: `Solar Quotation - ${customerName}`,
  });
}

async function printQuotation() {
  const downloadButton = document.querySelector("[data-print-quotation]");
  const originalLabel = downloadButton?.textContent || "Download PDF";

  if (downloadButton) {
    downloadButton.disabled = true;
    downloadButton.textContent = "Preparing PDF...";
  }

  try {
    const lead = await saveQuotation();
    if (!lead) return;

    const filename = await downloadQuotationFile(lead);
    showAdminToast(`${filename} downloaded.`, "success");
  } catch (error) {
    console.error("Quotation PDF download failed", error);
    showAdminToast(error.message || "The quotation PDF could not be downloaded.", "error");
  } finally {
    if (downloadButton) {
      downloadButton.disabled = false;
      downloadButton.textContent = originalLabel;
    }
  }
}

function normalizePhoneNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `${WHATSAPP_COUNTRY_CODE}${digits}`;
  return digits;
}

async function sendQuotationOnWhatsapp() {
  const lead = await saveQuotation();
  if (!lead) return;

  const phone = normalizePhoneNumber(lead.phone);
  if (!phone) {
    window.alert("This lead does not have a phone number.");
    return;
  }

  const total = formatCurrency(lead.quotation.total);
  const message = encodeURIComponent(
    `Hello ${lead.name || ""},\n\nYour solar quotation from FLYINGAPES TECHNOLOGIES PRIVATE LIMITED is ready.\n\nSystem: ${lead.quotation.systemSize || "-"} kW ${lead.quotation.systemType || ""}\nPanel: ${lead.quotation.solarPanelBrand || "-"}\nInverter: ${lead.quotation.inverterBrand || "-"}\nFinal Quotation: ${total}\n\nWe will share the PDF quotation with you for review.`,
  );

  window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
}

function csvValue(value) {
  const text = String(value || "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportLeads() {
  const leads = getVisibleLeads();
  if (!leads.length) {
    showAdminToast("There are no visible leads to export.", "warning");
    return;
  }

  const header = CSV_COLUMNS.map(([, label]) => csvValue(label)).join(",");
  const rows = leads.map((lead) =>
    CSV_COLUMNS.map(([key]) => csvValue(key === "createdAt" ? formatDate(lead[key]) : lead[key])).join(","),
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `your-energy-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showAdminToast(`Exported ${leads.length} lead${leads.length === 1 ? "" : "s"} to CSV.`);
}

function clearLeads() {
  const leads = readLeads();
  if (!leads.length) return;

  if (isRemoteMode) {
    window.alert("Bulk clear is disabled for production leads to avoid accidental data loss.");
    return;
  }

  const shouldClear = window.confirm("Clear all saved assessment leads from this browser?");
  if (!shouldClear) return;

  writeLeads([]);
  selectedLeadId = null;
  document.querySelector("[data-lead-detail]").hidden = true;
  renderLeads();
  showAdminToast("Local demo leads cleared.");
}

async function refreshLeads(event) {
  const button = event?.currentTarget || null;
  setButtonBusy(button, true, "Refreshing...");

  try {
    if (isRemoteMode && isAdminSignedIn) {
      await fetchRemoteLeads();
    }

    renderLeads();
    if (button) showAdminToast("Lead records refreshed.");
  } finally {
    setButtonBusy(button, false);
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  if (!supabaseClient) return;

  const formData = new FormData(event.currentTarget);
  setLoginStatus("Signing in...");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
  });

  if (error) {
    setLoginStatus(error.message);
    return;
  }

  isAdminSignedIn = true;
  setLoginStatus("");
  setLoginVisibility(false);
  setAdminAppVisibility(true);
  setSignOutVisibility(true);
  setAdminStorageNote(
    "Live Supabase storage",
    "Leads, statuses, documents, and quotations are now loading from the central production database.",
  );
  await refreshLeads();
}

async function handleAdminSignOut() {
  if (!supabaseClient) return;

  await supabaseClient.auth.signOut();
  isAdminSignedIn = false;
  leadCache = [];
  selectedLeadId = null;
  closeDetailPanel();
  setAdminAppVisibility(false);
  setLoginVisibility(true);
  setSignOutVisibility(false);
  renderLeads();
}

async function initializeAdminBackend() {
  setAdminAppVisibility(true);
  setLoginVisibility(false);
  setSignOutVisibility(false);
  setAdminSetupVisibility(false);

  if (!hasSupabaseConfig() || !window.supabase?.createClient) {
    isRemoteMode = false;
    setAdminStorageNote(
      "Local fallback mode",
      "Supabase is not configured yet, so this browser is showing only locally saved demo leads. Configure Supabase before using the admin panel for real customer data.",
    );
    setAdminSetupVisibility(true);
    renderLeads();
    return;
  }

  const { url, anonKey } = getSupabaseConfig();
  supabaseClient = window.supabase.createClient(url, anonKey);
  isRemoteMode = true;
  setAdminAppVisibility(false);
  setAdminStorageNote(
    "Live Supabase storage",
    "Sign in to load production leads, documents, quotation data, and application statuses.",
  );

  const { data } = await supabaseClient.auth.getSession();
  isAdminSignedIn = Boolean(data?.session);

  if (!isAdminSignedIn) {
    setLoginVisibility(true);
    renderLeads();
    return;
  }

  setLoginVisibility(false);
  setAdminAppVisibility(true);
  setSignOutVisibility(true);
  await refreshLeads();
}

function closeDetailPanel() {
  selectedLeadId = null;
  const panel = document.querySelector("[data-lead-detail]");
  if (panel) panel.hidden = true;
}

document.addEventListener("DOMContentLoaded", async () => {
  await initializeAdminBackend();

  document.querySelector("[data-refresh-leads]")?.addEventListener("click", refreshLeads);
  document.querySelector("[data-export-leads]")?.addEventListener("click", exportLeads);
  document.querySelector("[data-clear-leads]")?.addEventListener("click", clearLeads);
  document.querySelector("[data-close-detail]")?.addEventListener("click", closeDetailPanel);
  document.querySelector("[data-lead-search]")?.addEventListener("input", syncLeadViewState);
  document.querySelector("[data-lead-filters]")?.addEventListener("change", syncLeadViewState);
  document.querySelector("[data-lead-filters]")?.addEventListener("reset", resetLeadViewState);
  document.querySelector("[data-edit-lead-form]")?.addEventListener("submit", handleEditLeadSubmit);
  document.querySelector("[data-close-edit-lead]")?.addEventListener("click", closeEditLeadDialog);
  document.querySelector("[data-cancel-edit-lead]")?.addEventListener("click", closeEditLeadDialog);
  document.querySelector("[data-edit-selected-lead]")?.addEventListener("click", () => {
    const lead = getSelectedLead();
    if (lead) openEditLead(lead);
  });
  document.querySelector("[data-delete-selected-lead]")?.addEventListener("click", (event) => {
    const lead = getSelectedLead();
    if (lead) deleteLead(lead.id, event.currentTarget);
  });
  document.querySelector("[data-admin-login-form]")?.addEventListener("submit", handleAdminLogin);
  document.querySelector("[data-admin-sign-out]")?.addEventListener("click", handleAdminSignOut);
  document.querySelector("[data-save-quotation]")?.addEventListener("click", () => {
    saveQuotation();
  });
  document.querySelector("[data-print-quotation]")?.addEventListener("click", () => {
    printQuotation();
  });
  document.querySelector("[data-whatsapp-quotation]")?.addEventListener("click", () => {
    sendQuotationOnWhatsapp();
  });
  document.querySelector("[data-quotation-form]")?.addEventListener("input", () => {
    const lead = getSelectedLead();
    if (lead) renderQuotationPreview(lead);
  });
  document.querySelector("[data-quotation-form]")?.addEventListener("change", () => {
    const lead = getSelectedLead();
    if (lead) renderQuotationPreview(lead);
  });
  document.querySelector("[data-application-status]")?.addEventListener("change", async (event) => {
    const lead = getSelectedLead();
    if (!lead) return;

    event.target.disabled = true;
    try {
      const updatedLead = await updateLead(lead.id, (draft) => ({
        ...draft,
        applicationStatus: event.target.value,
      }));
      if (updatedLead) {
        renderLeads();
        showAdminToast("Application status updated.");
      } else {
        event.target.value = lead.applicationStatus;
        showAdminToast("Application status was not changed.", "error");
      }
    } finally {
      event.target.disabled = false;
    }
  });

  document.querySelector("[data-edit-lead-dialog]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeEditLeadDialog();
  });
  document.querySelector("[data-edit-lead-dialog]")?.addEventListener("close", () => {
    editingLeadId = null;
    clearEditLeadErrors();
  });

  document.addEventListener("click", async (event) => {
    const openButton = event.target.closest("[data-open-lead]");
    const editButton = event.target.closest("[data-edit-lead]");
    const deleteButton = event.target.closest("[data-delete-lead]");
    const removeButton = event.target.closest("[data-remove-document]");
    const downloadButton = event.target.closest("[data-download-document]");

    if (openButton) {
      const lead = readLeads().find((item) => item.id === openButton.dataset.openLead);
      if (lead) renderLeadDetail(lead);
    }

    if (editButton) {
      const lead = readLeads().find((item) => item.id === editButton.dataset.editLead);
      if (lead) openEditLead(lead);
    }

    if (deleteButton) {
      await deleteLead(deleteButton.dataset.deleteLead, deleteButton);
    }

    if (removeButton) {
      await removeDocument(removeButton.dataset.removeDocument);
    }

    if (downloadButton) {
      downloadRemoteDocument(downloadButton.dataset.downloadDocument);
    }
  });

  document.addEventListener("change", (event) => {
    const input = event.target.closest("[data-document-input]");
    if (input) handleDocumentUpload(input);
  });
});
