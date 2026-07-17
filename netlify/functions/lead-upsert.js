const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(body),
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function mapLeadToRow(lead) {
  const clientLeadId = cleanText(lead.clientLeadId || lead.id);

  if (!clientLeadId) {
    throw new Error("Missing lead id.");
  }

  return {
    client_lead_id: clientLeadId,
    status: cleanText(lead.status) || "Estimate Viewed",
    customer_type: cleanText(lead.customerType),
    property_type: cleanText(lead.propertyType),
    monthly_bill: cleanText(lead.monthlyBill),
    city: cleanText(lead.city),
    name: cleanText(lead.name),
    phone: cleanText(lead.phone),
    estimated_system: cleanText(lead.estimatedSystem),
    roof_area: cleanText(lead.roofArea),
    monthly_savings: cleanText(lead.monthlySavings),
    investment: cleanText(lead.investment),
    note: cleanText(lead.note),
  };
}

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const result = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  const text = await result.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!result.ok) {
    throw new Error(data?.message || data?.hint || data?.raw || "Supabase request failed.");
  }

  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return response(204, {});
  }

  if (event.httpMethod !== "POST") {
    return response(405, { ok: false, error: "Method not allowed." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const row = mapLeadToRow(body.lead || body);
    console.log("[lead-upsert] received", {
      clientLeadId: row.client_lead_id,
      status: row.status,
    });

    const existing = await supabaseRequest(
      `/leads?client_lead_id=eq.${encodeURIComponent(row.client_lead_id)}&select=id,created_at,application_status,documents,quotation&limit=1`,
      { method: "GET" },
    );
    const isUpdate = Boolean(existing?.length);

    console.log("[lead-upsert] lookup complete", {
      clientLeadId: row.client_lead_id,
      action: isUpdate ? "update" : "insert",
    });

    const savedRows = isUpdate
      ? await supabaseRequest(`/leads?id=eq.${existing[0].id}`, {
          method: "PATCH",
          body: JSON.stringify(row),
        })
      : await supabaseRequest("/leads", {
          method: "POST",
          body: JSON.stringify({
            ...row,
            application_status: "Application Applied",
            documents: {},
            quotation: {},
          }),
        });

    const saved = savedRows?.[0];
    console.log("[lead-upsert] saved", {
      id: saved?.id || null,
      clientLeadId: saved?.client_lead_id || row.client_lead_id,
      action: isUpdate ? "updated" : "inserted",
    });

    return response(200, {
      ok: true,
      id: saved?.id,
      clientLeadId: saved?.client_lead_id || row.client_lead_id,
    });
  } catch (error) {
    console.error("[lead-upsert] failed", {
      message: error.message || "Could not save lead.",
      stack: error.stack || null,
    });

    return response(500, {
      ok: false,
      error: error.message || "Could not save lead.",
    });
  }
};
