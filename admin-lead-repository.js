(function exposeAdminLeadRepository(root, factory) {
  const repository = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = repository;
    return;
  }

  root.YourEnergyAdminLeadRepository = repository;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAdminLeadRepository() {
  async function deleteRemoteLead(client, options = {}) {
    const leadId = String(options.leadId || "").trim();
    const bucket = String(options.bucket || "").trim();
    const documentPaths = Array.isArray(options.documentPaths) ? options.documentPaths.filter(Boolean) : [];

    if (!client || !leadId) throw new Error("A Supabase client and lead id are required.");

    const { data, error } = await client.from("leads").delete().eq("id", leadId).select("id");
    if (error) throw error;
    if (!Array.isArray(data) || !data.some((row) => row.id === leadId)) {
      throw new Error("The database did not confirm deletion. Refresh the dashboard and try again.");
    }

    let cleanupError = null;
    if (bucket && documentPaths.length) {
      const cleanupResult = await client.storage.from(bucket).remove(documentPaths);
      cleanupError = cleanupResult.error || null;
    }

    return { deletedId: leadId, cleanupError };
  }

  return { deleteRemoteLead };
});
