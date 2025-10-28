exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed. Use POST instead." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const userMessage = body.message?.trim();

    if (!userMessage || typeof userMessage !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid request format. Expected a 'message' field with text.",
        }),
      };
    }

    console.log("Received user message:", userMessage);

    // 🧠 Creator trigger detection — enhanced for casual & follow-up phrasing
    // (Removed: handled by LLM system prompt)

    // Single attempt to RAG to stay under 10s total
    let response;
    try {
      response = await fetch(process.env.RAG_SERVER_URL || "http://localhost:3001/ask", {
      method: "POST",
      headers: {
        "x-api-key": process.env.VPS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Align with RAG server contract
        question: userMessage
      }),
      signal: AbortSignal.timeout(4000) // keep short to allow LLM fallback within 10s
    });
    } catch (e) {
      response = undefined;
    }

    if (!response || !response.ok) {
      const errorData = await response?.json?.().catch(() => undefined);
      console.error("Local API Error:", errorData);
      // Fallback to LLM directly (OpenRouter) if RAG is down or returns error
      try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error("Missing OPENROUTER_API_KEY");
        }
        const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "mistralai/mistral-small-3.2-24b-instruct:free",
            messages: [
              { role: "system", content: `You are Huduma, an AI assistant specializing in Kenyan legislation and policy information. Be precise, cite acts when relevant, and say you lack info if context is missing.` },
              { role: "user", content: userMessage }
            ]
          }),
          signal: AbortSignal.timeout(6000)
        });
        const llmData = await llmRes.json();
        const answer = llmData?.choices?.[0]?.message?.content?.trim() || "Sorry, I do not have official information on that topic.";
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ reply: answer, context: [], source: "llm-fallback" }),
        };
      } catch (llmErr) {
              return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ reply: "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!", context: [], source: "rule-fallback" }),
        };
      }
    }

    const data = await response.json();
    console.log("Full AI Response:", data);

    const cleanedReply = data?.answer?.trim() || "I am Huduma, your legislative information assistant. How can I help you understand Kenyan legislation and policy today?";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ reply: cleanedReply, context: data?.context || [], source: "rag" }),
    };
  } catch (error) {
    console.error("Server Error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Error: " + error.message }),
    };
  }
}