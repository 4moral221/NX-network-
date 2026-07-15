import { requireAuth } from "../core";
import express from "express";

const router = express.Router();

/**
 * Robust helper to call the GLM model on NVIDIA NIM API
 * Supports both standard text completions and structured JSON formatting
 * Dynamically falls back to faster/more efficient GLM model IDs if one fails.
 */
async function callNvidiaGLM(
  prompt: string,
  systemInstruction = "You are a professional retail and supply chain AI assistant.",
  jsonMode = false
): Promise<string> {
  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaApiKey) {
    throw new Error("NVIDIA_API_KEY is missing");
  }

  const candidates = [
    process.env.GLM_MODEL_ID,
    "thm/glm-4-9b-chat",
    "nvidia/glm-4-9b-chat",
    "glm-4-9b-chat",
    "glm-4"
  ].filter(Boolean) as string[];

  let lastError: any = null;

  for (const model of candidates) {
    try {
      console.log(`[NVIDIA NIM] Attempting GLM model: ${model} (JSON Mode: ${jsonMode})...`);
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${nvidiaApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: systemInstruction
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {})
        })
      });

      if (!response.ok) {
        throw new Error(`NVIDIA NIM returned status: ${response.status} for model ${model}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error(`Empty response from NVIDIA NIM GLM using model ${model}`);
      }

      console.log(`[NVIDIA NIM] Successfully completed call using GLM model: ${model}`);
      return text;
    } catch (err: any) {
      console.warn(`[NVIDIA NIM] Candidate ${model} failed, checking fallback candidate... Error:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("All GLM model candidates failed");
}

router.post('/api/gemini/fmcg-insights', requireAuth, async (req, res) => {
    const { brandName, utilizationRate, activeBoosts, tier } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const util = parseFloat(utilizationRate) || 45;
      const t = tier || 'BASIC';
      const boosts = parseInt(activeBoosts) || 2;

      // Rule-based throttle and multiplier calculation
      let multiplier = 1.0;
      let ceiling = "20%";
      if (util >= 90) {
        multiplier = 0.0;
        ceiling = "0% (Rewards Disabled)";
      } else if (util >= 70) {
        multiplier = 0.25;
        ceiling = "0% (Throttled)";
      } else if (util >= 40) {
        multiplier = 0.5;
        ceiling = "10%";
      }

      const advicePrompt = `You are an expert Chief Executive Advisor for the NX Informal Retail Network in Kenya.
Analyze the performance state of the FMCG Brand "${brandName || 'Brookside'}" on the network.
Current Network Health State:
- Liquidity Pool Utilization: ${util}% (Throttling Multiplier: ${multiplier}x, Merchant Acceptance Ceiling: ${ceiling})
- Brand's Active SKU Boosts: ${boosts}
- Core Franchise Tier: ${t}

Provide a short, elegant, strategic 3-paragraph execution memo for this brand (FMCG Partner). 
Reference specific Kenyan context (such as Nairobi retail corridors like Eastleigh, Kawangware, Kibera, Githurai, Kasarani, Roysambu, and duaka/kiosk behaviors).
Highlight how they can use the Franchise Tiers (BASIC, CERTIFIED, HUB with 60%, 65%, 70% Pool Rates) and how they can optimize their FMCG Boosts to push SKU volume. 
Address the safety rails (the current throttling of ${multiplier}x and merchant acceptance ceiling of ${ceiling}) and suggest whether they should inject more booster liquidity into the pool or expand wholesale distribution to HUB merchants to bypass distributor bottleneck.
Keep the tone inspiring, professional, and dense with genuine retail economic advice. Do not use generic filler words. Format nicely in Markdown.`;

      let text: string | undefined;

      try {
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY is missing");
        }

        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: advicePrompt
        });

        text = response.text;
        if (!text) throw new Error("Empty insights response from Gemini");
        return res.json({ success: true, insights: text, provider: "gemini" });

      } catch (geminiErr: any) {
        console.warn("[Gemini fmcg-insights] Gemini failed or key missing. Attempting Nvidia GLM fallback...", geminiErr.message || geminiErr);
        if (process.env.NVIDIA_API_KEY) {
          try {
            text = await callNvidiaGLM(
              advicePrompt,
              "You are an expert Chief Executive Advisor for the NX Informal Retail Network in Kenya."
            );
            console.log("[fmcg-insights] Successfully generated insights using Nvidia GLM fallback.");
            return res.json({ success: true, insights: text, provider: "nvidia_nim" });
          } catch (nvidiaErr: any) {
            console.error("[Nvidia GLM fmcg-insights Fallback] Failed as well:", nvidiaErr.message || nvidiaErr);
            throw nvidiaErr;
          }
        } else {
          throw geminiErr;
        }
      }

    } catch (err: any) {
      console.error("Gemini/GLM insights generation error:", err);
      // Local Simulated Fallback
      const brandName = req.body?.brandName;
      const utilizationRate = req.body?.utilizationRate;
      const tier = req.body?.tier;

      const calculatedTier = tier || 'BASIC';
      const calcMultiplier = (utilizationRate || 45) >= 90 ? '0' : (utilizationRate || 45) >= 70 ? '0.25' : (utilizationRate || 45) >= 40 ? '0.5' : '1.0';
      const calcCeiling = calculatedTier === 'HUB' ? '40%' : calculatedTier === 'CERTIFIED' ? '30%' : '20%';

      const simResponse = `### NX EXECUTIVE ADVISORY: PORTFOLIO RECOMMENDATIONS FOR ${brandName?.toUpperCase() || 'BROOKSIDE'} [SIMULATION ADVISORY]

Our network logs indicate a Liquidity Pool Utilization of **${utilizationRate || 45}%**, causing the automatic throttling engine to lock at **${calcMultiplier}x rewards**. In key markets like *Kasarani*, *Kawangware* and *Kibera*, this shifts buyer focus to highly incentivized goods. Since you are operating under the **${calculatedTier} tier**, your pool rate is optimized at **${calculatedTier === 'HUB' ? '70%' : calculatedTier === 'CERTIFIED' ? '65%' : '60%'}**, allowing for substantial local flexibility.

To enhance SKU pull throughout the remaining cycle, we advise initiating a designated FMCG Boost campaign. By supplementing the gross margin with an explicit brand contribution list of KES 50-100 per transaction, your products will enjoy a **high-health status conversion** even as general merchant acceptance stays capped at **${calcCeiling}**.

Action steps: 
1. Upgrade high-velocity regional dukas coordinates to **CERTIFIED** status to increase their cycles.
2. Distribute buffer reserves to central **HUB zones** to ensure zero lead times in the supply chains.`;
      return res.json({ success: true, insights: simResponse, simulated: true, errorMsg: err.message });
    }
  });
router.post('/api/gemini/compile-batch', requireAuth, async (req, res) => {
    const { fileContent } = req.body;
    if (!fileContent) {
      return res.status(400).json({ success: false, error: "Missing fileContent parameter in request body" });
    }

    const fallbackParseMasterFile = (content: string) => {
      const batchMatch = content.match(/Batch ID:\s*([^\r\n]+)/i);
      const batchId = batchMatch ? batchMatch[1].trim() : "BATCH-38294";

      const skuMatch = content.match(/SKU Code:\s*([^\r\n]+)/i);
      const skuCode = skuMatch ? skuMatch[1].trim() : "F";

      const lines = content.split('\n');
      const localitiesMap: Record<string, any[]> = {};

      const nameMap: Record<string, string> = {
        "M-910": "Mama Mwangi Duka",
        "M-112": "Lake Basin Wholesalers",
        "M-305": "Kasarani Millers Retail",
        "M-704": "Clay City General Store",
        "M-443": "Mwiki Super-Save kiosk",
        "M-881": "Kahawa West Duka",
        "M-209": "Githurai Fresh Market",
        "M-104": "Heshima Wholesale shop"
      };

      for (const line of lines) {
        if (!line.includes("MERCHANT_CODE")) continue;

        const merchantCodeMatch = line.match(/MERCHANT_CODE:\s*([^\s|]+)/i);
        const phoneMatch = line.match(/PHONE:\s*([^\s|]+)/i);
        const orderSpecMatch = line.match(/ORDER_SPEC:\s*([^\s|]+[^*]*\*\d+|[^\s|]+)/i);
        const orderQtyMatch = line.match(/ORDER_QTY:\s*(\d+)/i);
        const locationMatch = line.match(/LOCATION:\s*([^\r\n|]+)/i);

        if (merchantCodeMatch) {
          const merchantCode = merchantCodeMatch[1].trim();
          const phone = phoneMatch ? phoneMatch[1].trim() : "+254712345678";
          const specificOrder = orderSpecMatch ? orderSpecMatch[1].trim() : "Pembe 2kg*10";
          const exactQuantity = orderQtyMatch ? parseInt(orderQtyMatch[1].trim(), 10) : 10;
          const rawLoc = locationMatch ? locationMatch[1].trim() : "Roysambu";
          
          const cleanLoc = rawLoc.replace(/\([^)]+\)/g, '').trim();
          const merchantName = nameMap[merchantCode] || `Duka ${merchantCode}`;

          const orderObj = {
            merchantCode,
            phone,
            merchantName,
            specificOrder,
            exactQuantity
          };

          if (!localitiesMap[cleanLoc]) {
            localitiesMap[cleanLoc] = [];
          }
          localitiesMap[cleanLoc].push(orderObj);
        }
      }

      const localities = Object.entries(localitiesMap).map(([name, orders]) => ({
        name,
        orders
      }));

      if (localities.length === 0) {
        return {
          batchId,
          skuCode,
          localities: [
            {
              name: "Roysambu",
              orders: [
                {
                  merchantCode: "M-910",
                  phone: "+254712345678",
                  merchantName: "Mama Mwangi Duka",
                  specificOrder: "Pembe 2kg*15",
                  exactQuantity: 15
                }
              ]
            },
            {
              name: "Kasarani",
              orders: [
                {
                  merchantCode: "M-305",
                  phone: "+254711111111",
                  merchantName: "Kasarani Millers Retail",
                  specificOrder: "Pembe 2kg*25",
                  exactQuantity: 25
                }
              ]
            }
          ]
        };
      }

      return {
        batchId,
        skuCode,
        localities
      };
    };

    const advicePrompt = `Analyze the following raw NX Batch Master Shipment file:
${fileContent}

Compile the orders into localized route plan groupings based on geographical proximity within Nairobi regions (e.g., grouping by Githurai, Roysambu, Kasarani, Clay City, Kahawa West, Mwiki, etc.). Use the Location from the raw log as reference.

Please output a JSON object obeying the requested schema. Ensure that you:
1. Extract the Batch ID and SKU Code from the master file header.
2. Group all orders by their regional locality (e.g., Githurai, Kasarani, Roysambu, etc.).
3. For each merchant order, extract the MERCHANT_CODE, PHONE, and ORDER_SPEC. Also generate a realistic Kenyan duka merchant business name (e.g. "Mama Mwangi Duka", "Amani Retail", "Kasarani Wholesale", "Githurai Fresh Market") for the merchantName field based on their unique merchant code. Yes, generate a realistic merchant name since it is not provided in raw text.
4. Set specificOrder as the ORDER_SPEC (e.g. "Pembe 2kg*15") and exactQuantity as the integer parsed from the ORDER_QTY field (e.g. 15).
`;

    // 1. Try Nvidia NIM with GLM model first if API key is present
    const nvidiaApiKey = process.env.NVIDIA_API_KEY;
    if (nvidiaApiKey) {
      try {
        console.log("[System] NVIDIA NIM API key found. Compiling batch with GLM model...");
        const text = await callNvidiaGLM(
          advicePrompt + "\nRespond with a JSON object containing keys: batchId (string), skuCode (string), and localities (array of objects with keys 'name' and 'orders' array, where orders elements contain keys: merchantCode, phone, merchantName, specificOrder, exactQuantity).",
          "You are a professional supply chain data parser. Respond ONLY with valid, raw JSON adhering to the schema.",
          true
        );

        const parsed = JSON.parse(text);
        return res.json({ success: true, compiled: parsed, provider: "nvidia_nim" });
      } catch (err: any) {
        console.warn("[NVIDIA NIM Fallback] GLM batch compile failed or returned invalid response:", err.message || err);
        // Fall through to Gemini or Regex fallback
      }
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("[System] GEMINI_API_KEY is missing. Using local fallback parser for batch compiler.");
        const fallbackResults = fallbackParseMasterFile(fileContent);
        return res.json({ success: true, compiled: fallbackResults, simulated: true });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: advicePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as any,
            properties: {
              batchId: { type: "STRING" },
              skuCode: { type: "STRING" },
              localities: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING", description: "The localized area or neighborhood zone in Nairobi" },
                    orders: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          merchantCode: { type: "STRING" },
                          phone: { type: "STRING" },
                          merchantName: { type: "STRING" },
                          specificOrder: { type: "STRING" },
                          exactQuantity: { type: "INTEGER" }
                        },
                        required: ["merchantCode", "phone", "merchantName", "specificOrder", "exactQuantity"]
                      }
                    }
                  },
                  required: ["name", "orders"]
                }
              }
            },
            required: ["batchId", "skuCode", "localities"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty compile response from Gemini");

      const parsed = JSON.parse(text);
      res.json({ success: true, compiled: parsed, provider: "gemini" });

    } catch (err: any) {
      console.warn("[Gemini Fallback] Gemini batch compile unavailable, using regex parser fallback:", err.message || err);
      try {
        const fall = fallbackParseMasterFile(fileContent);
        return res.json({ success: true, compiled: fall, simulated: true, errorMsg: err.message });
      } catch (ex: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

export default router;
