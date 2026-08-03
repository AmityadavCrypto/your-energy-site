const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const adminHtml = fs.readFileSync(path.join(__dirname, "..", "admin.html"), "utf8");

test("loads the tested lead utilities before the dashboard controller", () => {
  const utilitiesIndex = adminHtml.indexOf("admin-lead-utils.js");
  const repositoryIndex = adminHtml.indexOf("admin-lead-repository.js");
  const dashboardIndex = adminHtml.indexOf("admin.js");

  assert.notEqual(utilitiesIndex, -1);
  assert.notEqual(repositoryIndex, -1);
  assert.notEqual(dashboardIndex, -1);
  assert.ok(utilitiesIndex < dashboardIndex);
  assert.ok(repositoryIndex < dashboardIndex);
});

test("includes every dashboard management control", () => {
  const hooks = [
    "data-lead-filters",
    "data-lead-search",
    "data-lead-offering",
    "data-lead-stage-filter",
    "data-lead-sort",
    "data-edit-lead-dialog",
    "data-edit-lead-form",
    "data-edit-selected-lead",
    "data-delete-selected-lead",
    "data-lead-call",
    "data-lead-whatsapp",
    "data-admin-toast-region",
  ];

  hooks.forEach((hook) => assert.ok(adminHtml.includes(hook), `Missing ${hook}`));
});

test("provides form controls for every editable lead field", () => {
  const fields = [
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

  fields.forEach((field) => assert.ok(adminHtml.includes(`name="${field}"`), `Missing editable field ${field}`));
});
