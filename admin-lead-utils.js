(function exposeAdminLeadUtils(root, factory) {
  const utils = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = utils;
    return;
  }

  root.YourEnergyAdminLeadUtils = utils;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAdminLeadUtils() {
  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function normalizeSearchValue(value) {
    return cleanText(value).toLocaleLowerCase("en-IN");
  }

  function timestamp(value) {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function filterAndSortLeads(leads, options = {}) {
    const search = normalizeSearchValue(options.search);
    const offering = normalizeSearchValue(options.offering);
    const applicationStatus = normalizeSearchValue(options.applicationStatus);
    const sort = cleanText(options.sort) || "newest";

    const filtered = (Array.isArray(leads) ? leads : []).filter((lead) => {
      const matchesOffering = !offering || offering === "all" || normalizeSearchValue(lead.leadSource) === offering;
      const matchesStatus =
        !applicationStatus ||
        applicationStatus === "all" ||
        normalizeSearchValue(lead.applicationStatus) === applicationStatus;
      const haystack = [
        lead.name,
        lead.phone,
        lead.projectName,
        lead.city,
        lead.propertyType,
        lead.customerType,
        lead.contactRole,
        lead.decisionStage,
        lead.estimatedSystem,
        lead.note,
      ]
        .map(normalizeSearchValue)
        .join(" ");
      const matchesSearch = !search || haystack.includes(search);

      return matchesOffering && matchesStatus && matchesSearch;
    });

    return filtered.sort((left, right) => {
      if (sort === "oldest") return timestamp(left.createdAt) - timestamp(right.createdAt);
      if (sort === "updated") {
        return timestamp(right.updatedAt || right.createdAt) - timestamp(left.updatedAt || left.createdAt);
      }
      if (sort === "name") {
        return cleanText(left.projectName || left.name).localeCompare(cleanText(right.projectName || right.name), "en-IN", {
          sensitivity: "base",
        });
      }

      return timestamp(right.createdAt) - timestamp(left.createdAt);
    });
  }

  function validateLeadInput(input = {}) {
    const value = {
      ...input,
      name: cleanText(input.name),
      phone: cleanText(input.phone),
      leadSource: cleanText(input.leadSource) || "Homes",
      applicationStatus: cleanText(input.applicationStatus) || "Application Applied",
    };
    const errors = {};
    const phoneDigits = value.phone.replace(/\D/g, "");

    if (!value.name) errors.name = "Contact name is required.";
    if (!value.phone) {
      errors.phone = "Phone number is required.";
    } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      errors.phone = "Enter a valid phone number with 10 to 15 digits.";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      value,
    };
  }

  function getDocumentPaths(lead) {
    const paths = Object.values(lead?.documents || {})
      .map((documentItem) => cleanText(documentItem?.path))
      .filter(Boolean);

    return [...new Set(paths)];
  }

  function removeLeadById(leads, leadId) {
    return (Array.isArray(leads) ? leads : []).filter((lead) => lead.id !== leadId);
  }

  return {
    filterAndSortLeads,
    getDocumentPaths,
    removeLeadById,
    validateLeadInput,
  };
});
