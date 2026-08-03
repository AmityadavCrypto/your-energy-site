const test = require("node:test");
const assert = require("node:assert/strict");
const { deleteRemoteLead } = require("../admin-lead-repository.js");

function createSupabaseMock({ deleteResult, cleanupResult = { error: null } }) {
  const operations = [];
  const query = {
    delete() {
      operations.push("delete-row");
      return query;
    },
    eq(column, value) {
      operations.push(`match:${column}:${value}`);
      return query;
    },
    async select(columns) {
      operations.push(`confirm:${columns}`);
      return deleteResult;
    },
  };
  const client = {
    from(table) {
      operations.push(`table:${table}`);
      return query;
    },
    storage: {
      from(bucket) {
        operations.push(`bucket:${bucket}`);
        return {
          async remove(paths) {
            operations.push(`cleanup:${paths.join("|")}`);
            return cleanupResult;
          },
        };
      },
    },
  };

  return { client, operations };
}

test("deletes the confirmed Supabase row before cleaning up documents", async () => {
  const { client, operations } = createSupabaseMock({ deleteResult: { data: [{ id: "lead-1" }], error: null } });
  const result = await deleteRemoteLead(client, {
    leadId: "lead-1",
    bucket: "lead-documents",
    documentPaths: ["lead-1/aadhaar.png", "lead-1/pan.png"],
  });

  assert.equal(result.deletedId, "lead-1");
  assert.equal(result.cleanupError, null);
  assert.deepEqual(operations, [
    "table:leads",
    "delete-row",
    "match:id:lead-1",
    "confirm:id",
    "bucket:lead-documents",
    "cleanup:lead-1/aadhaar.png|lead-1/pan.png",
  ]);
});

test("does not clean up documents when the database does not confirm deletion", async () => {
  const { client, operations } = createSupabaseMock({ deleteResult: { data: [], error: null } });

  await assert.rejects(
    deleteRemoteLead(client, {
      leadId: "lead-1",
      bucket: "lead-documents",
      documentPaths: ["lead-1/aadhaar.png"],
    }),
    /did not confirm deletion/i,
  );
  assert.equal(operations.some((operation) => operation.startsWith("cleanup:")), false);
});

test("reports document cleanup errors after a successful row deletion", async () => {
  const cleanupError = new Error("Storage unavailable");
  const { client } = createSupabaseMock({
    deleteResult: { data: [{ id: "lead-1" }], error: null },
    cleanupResult: { error: cleanupError },
  });
  const result = await deleteRemoteLead(client, {
    leadId: "lead-1",
    bucket: "lead-documents",
    documentPaths: ["lead-1/aadhaar.png"],
  });

  assert.equal(result.cleanupError, cleanupError);
});
