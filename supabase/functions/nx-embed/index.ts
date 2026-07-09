import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const JINA_API_KEY = Deno.env.get("JINA_API_KEY") ?? "";
const JINA_MODEL   = "jina-embeddings-v2-base-en";

const SKU_SEED = [
  { code: "BR", en: "Bread", sw: "Mkate" },
  { code: "ML", en: "Milk", sw: "Maziwa" },
  { code: "SG", en: "Sugar", sw: "Sukari" },
  { code: "CO", en: "Cooking Oil", sw: "Mafuta" },
  { code: "F", en: "Maize/Wheat Flour", sw: "Unga" },
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  const { action } = await req.json();

  if (action === "seed") {
    if (!JINA_API_KEY) return new Response("JINA_API_KEY missing", { status: 400, headers: CORS });

    const results = [];
    for (const item of SKU_SEED) {
      // Get embedding for English name
      const res = await fetch("https://api.jina.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${JINA_API_KEY}`,
        },
        body: JSON.stringify({ model: JINA_MODEL, input: [item.en] }),
      });
      
      const data = await res.json();
      const embedding = data.data[0]?.embedding;

      if (embedding) {
        const { error } = await supabase.from("sku_catalog").upsert({
          sku_code:  item.code,
          name_en:   item.en,
          name_sw:   item.sw,
          embedding: embedding,
        });
        results.push({ code: item.code, success: !error, error });
      }
    }
    return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json", ...CORS } });
  }

  if (action === "match") {
    const { input, threshold = 0.1 } = await req.json(); // Drastically lowered threshold for autocorrect
    if (!input || !JINA_API_KEY) return new Response("Input or API Key missing", { status: 400, headers: CORS });

    // 1. Get embedding for user input
    const res = await fetch("https://api.jina.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${JINA_API_KEY}`,
      },
      body: JSON.stringify({ model: JINA_MODEL, input: [input] }),
    });

    if (!res.ok) return new Response("Embedding failed", { status: 500, headers: CORS });
    
    const data = await res.json();
    const embedding = data.data[0]?.embedding;
    if (!embedding) return new Response("No embedding generated", { status: 500, headers: CORS });

    // 2. Hybrid search in nx_products and sku_catalog tables
    const { data: matches, error } = await supabase.rpc("match_sku_hybrid", {
      query_embedding: embedding,
      query_text:      input,
      match_threshold: threshold,
      match_count:     1
    });

    if (error || !matches?.length) {
      return new Response(JSON.stringify({ matched: false }), { headers: { "Content-Type": "application/json", ...CORS } });
    }

    return new Response(JSON.stringify({ 
      matched: true, 
      sku_code: matches[0].sku,
      name: matches[0].name,
      similarity: matches[0].score
    }), { headers: { "Content-Type": "application/json", ...CORS } });
  }

  if (action === "add_sku") {
    const { sku_code, description } = await req.json();
    if (!sku_code || !description) return new Response("Missing sku_code or description", { status: 400, headers: CORS });

    const embedding = await getInternalEmbedding(description);
    if (!embedding) return new Response("Failed to generate embedding", { status: 500, headers: CORS });

    const { error } = await supabase.from("sku_catalog").upsert({
      sku_code,
      name_en: description.split("\n")[0], // Use first line as name
      embedding
    });

    return new Response(JSON.stringify({ success: !error, error }), { headers: { "Content-Type": "application/json", ...CORS } });
  }

  return new Response("Invalid action", { status: 400, headers: CORS });
});

async function getInternalEmbedding(text: string): Promise<number[] | null> {
  // 1. Try Jina
  const JINA_KEY = Deno.env.get("JINA_API_KEY");
  if (JINA_KEY && JINA_KEY !== "YOUR_JINA_API_KEY") {
    try {
      const res = await fetch("https://api.jina.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${JINA_KEY}`,
        },
        body: JSON.stringify({ model: "jina-embeddings-v2-base-en", input: [text] }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data[0]?.embedding || null;
      }
    } catch (e) {
      console.warn("Jina embedding failed:", e);
    }
  }

  // 2. Try Gemini
  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
  if (GEMINI_KEY && GEMINI_KEY !== "MY_GEMINI_API_KEY") {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: { parts: [{ text }] } }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.embedding.values || null;
      } else {
        const err = await res.text();
        console.error("Gemini embedding failed. Key might be invalid or restricted:", err);
      }
    } catch (e) {
      console.warn("Gemini embedding failed:", e);
    }
  }

  return null;
}
