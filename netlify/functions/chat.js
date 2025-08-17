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
          response = await fetch(process.env.VPS_API_URL || "http://localhost:3001/api/chat", {
      method: "POST",
      headers: {
        "x-api-key": process.env.VPS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: userMessage,
        model: "llama3.2:3b",
        systemPrompt: "You are a helpful AI assistant built by Ireri Linus Mugendi, the mind behind Lino.ai. Keep responses concise and natural."
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
          "hello": "Hello! I'm Lino.AI, your friendly AI assistant. I'm currently in offline mode due to high user traffic, but I'm still here to chat! 😊",
          "how are you": "I'm doing well, thank you for asking! I'm currently running in offline mode, but I'm still happy to help where I can.",
          "what can you do": "I'm an AI assistant built by Ireri Linus Mugendi. I can help with conversations, answer questions, and provide assistance. Right now I'm in offline mode due to high user traffic.",
          "who created you": "I was proudly built by Ireri Linus Mugendi — the mind behind Lino.ai! 🛠️",
          "help": "I'm here to help! I can chat, answer questions, and assist you. Currently running in offline mode due to high user traffic, but I'm still functional.",
          "bye": "Goodbye! It was nice chatting with you. Have a great day! 👋",
          "thanks": "You're welcome! I'm glad I could help. 😊",
          "thank you": "You're very welcome! It's my pleasure to assist you."
        };
        
        // Check for simple keywords in the user message
        const lowerMessage = userMessage.toLowerCase();
        let localReply = "I'm currently in offline mode due to high user traffic, but I'm still here to chat! Feel free to ask me anything, and I'll do my best to help. 😊";
        
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
    const cleanedReply = rawReply || "I'm here to chat! Ask me anything.";

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