export async function handler(event) {
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

    // 🔁 Retry logic for rate-limited calls
    let retries = 3;
    let response;

    for (let i = 0; i < retries; i++) {
          response = await fetch(process.env.RAG_SERVER_URL || "http://localhost:3001/rag", {
      method: "POST",
      headers: {
        "x-api-key": process.env.VPS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
        model: "mistralai/mistral-small-3.2-24b-instruct:free",
        systemPrompt: `You are Huduma, an AI assistant specializing in Kenyan legislation and policy information. Your responses must:
1. Be based ONLY on the retrieved context provided
2. Cite specific acts, bills, or policies when they are referenced
3. Say "I don't have enough information about that in my knowledge base" if the context doesn't contain relevant information
4. Be clear and precise, avoiding speculation or inference
5. Focus solely on legislative and policy information
Never identify yourself as an AI model or mention any model providers. Maintain a professional, informative tone.`
      }),
      signal: AbortSignal.timeout(7000) // 7 second timeout to stay within Netlify limits
    });

      console.log(`API Response Status: ${response.status}`);

      if (response.status === 429) {
        console.warn(`Rate limit hit! Retrying in ${2 ** i} seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (2 ** i)));
      } else {
        break;
      }
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Local API Error:", errorData);
      
      // Check if it's a rate limit error
      if (response.status === 429 || response.status === 402) {
        // Simple local responses when API limit is hit
        const localResponses = {
          "hello": "Hello! I am Huduma, your legislative information assistant. I'm currently in offline mode due to high traffic, but I can still help with general questions about Kenyan legislation.",
          "how are you": "I'm here to help you with questions about Kenyan legislation and policy. Currently in offline mode, but I can still provide general guidance.",
          "what can you do": "I am Huduma, an AI assistant specializing in Kenyan legislation and policy information. I can help you understand various acts, bills, and policies. Currently in offline mode due to high traffic.",
          "who are you": "I am Huduma, an AI assistant specializing in Kenyan legislation and policy information. How can I assist you today?",
          "help": "I can help you understand Kenyan legislation and policies. While I'm currently in offline mode, feel free to ask about specific acts or bills.",
          "bye": "Goodbye! If you have more questions about Kenyan legislation later, feel free to return. Have a great day!",
          "thanks": "You're welcome! I'm here to help with any questions about Kenyan legislation and policy.",
          "thank you": "You're welcome! Feel free to return if you have more questions about Kenyan legislation and policy."
        };
        
        // Check for simple keywords in the user message
        const lowerMessage = userMessage.toLowerCase();
        let localReply = "I am currently in offline mode due to high traffic. While I can't access my full knowledge base at the moment, I can still provide general guidance about Kenyan legislation and policy. Please try again shortly for more detailed information.";
        
        for (const [keyword, response] of Object.entries(localResponses)) {
          if (lowerMessage.includes(keyword)) {
            localReply = response;
            break;
          }
        }
        
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ reply: localReply }),
        };
      }
      
              return {
          statusCode: response.status,
          body: JSON.stringify({
            error: errorData?.error?.message || "Unknown Local API error.",
          }),
        };
    }

    const data = await response.json();
    console.log("Full AI Response:", data);

    const rawReply = data?.response?.trim();
    const cleanedReply = rawReply || "I am Huduma, your legislative information assistant. How can I help you understand Kenyan legislation and policy today?";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ reply: cleanedReply }),
    };
  } catch (error) {
    console.error("Server Error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Error: " + error.message }),
    };
  }
}