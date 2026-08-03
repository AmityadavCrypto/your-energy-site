const test = require("node:test");
const assert = require("node:assert/strict");
const {
  filterAndSortLeads,
  getDocumentPaths,
  removeLeadById,
  validateLeadInput,
} = require("../admin-lead-utils.js");

const leads = [
  {
    id: "home",
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-02T08:00:00.000Z",
    leadSource: "Homes",
    applicationStatus: "Application Applied",
    name: "Amit Kumar",
    phone: "9261869245",
    city: "Kotputli",
    propertyType: "Independent Home",
  },
  {
    id: "commercial",
    createdAt: "2026-08-03T08:00:00.000Z",
    updatedAt: "2026-08-03T09:00:00.000Z",
    leadSource: "Commercial",
    applicationStatus: "Electricity Board Approval",
    projectName: "Sunrise Foods",
    name: "Neha Sharma",
    phone: "9876543210",
    city: "Jaipur",
  },
  {
    id: "society",
    createdAt: "2026-08-02T08:00:00.000Z",
    updatedAt: "2026-08-04T08:00:00.000Z",
    leadSource: "Housing Society",
    applicationStatus: "Application Applied",
    projectName: "Green View RWA",
    name: "Ravi Singh",
    phone: "9988776655",
    city: "Gurgaon",
  },
];

test("searches across contact, project, phone, city, and property fields", () => {
  assert.deepEqual(filterAndSortLeads(leads, { search: "sunrise" }).map((lead) => lead.id), ["commercial"]);
  assert.deepEqual(filterAndSortLeads(leads, { search: "926186" }).map((lead) => lead.id), ["home"]);
  assert.deepEqual(filterAndSortLeads(leads, { search: "independent" }).map((lead) => lead.id), ["home"]);
});

test("combines offering and application status filters", () => {
  const filtered = filterAndSortLeads(leads, {
    offering: "Housing Society",
    applicationStatus: "Application Applied",
  });

  assert.deepEqual(filtered.map((lead) => lead.id), ["society"]);
});

test("sorts by newest, oldest, recently updated, and name without mutating input", () => {
  assert.deepEqual(filterAndSortLeads(leads).map((lead) => lead.id), ["commercial", "society", "home"]);
  assert.deepEqual(filterAndSortLeads(leads, { sort: "oldest" }).map((lead) => lead.id), ["home", "society", "commercial"]);
  assert.deepEqual(filterAndSortLeads(leads, { sort: "updated" }).map((lead) => lead.id), ["society", "commercial", "home"]);
  assert.deepEqual(filterAndSortLeads(leads, { sort: "name" }).map((lead) => lead.id), ["home", "society", "commercial"]);
  assert.deepEqual(leads.map((lead) => lead.id), ["home", "commercial", "society"]);
});

test("validates required names and Indian or international phone formats", () => {
  assert.equal(validateLeadInput({ name: "", phone: "123" }).isValid, false);
  assert.deepEqual(validateLeadInput({ name: "", phone: "123" }).errors, {
    name: "Contact name is required.",
    phone: "Enter a valid phone number with 10 to 15 digits.",
  });
  assert.equal(validateLeadInput({ name: " Amit ", phone: "+91 92618 69245" }).isValid, true);
});

test("collects unique remote document paths and ignores local previews", () => {
  assert.deepEqual(
    getDocumentPaths({
      documents: {
        aadhaar: { path: "lead-1/aadhaar.png" },
        pan: { path: "lead-1/pan.png" },
        duplicate: { path: "lead-1/aadhaar.png" },
        local: { dataUrl: "data:image/png;base64,abc" },
      },
    }),
    ["lead-1/aadhaar.png", "lead-1/pan.png"],
  );
});

test("removes only the requested lead without mutating the original collection", () => {
  const remaining = removeLeadById(leads, "commercial");

  assert.deepEqual(remaining.map((lead) => lead.id), ["home", "society"]);
  assert.deepEqual(leads.map((lead) => lead.id), ["home", "commercial", "society"]);
});
