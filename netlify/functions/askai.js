const axios = require("axios");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed. Use POST instead." }),
    };
  }

  let userMessage = "";
  try {
    const body = JSON.parse(event.body || "{}");
    userMessage = body.message?.trim();

    if (!userMessage || typeof userMessage !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request format. Expected a 'message' field with text." }),
      };
    }

    // Rule-based responses for common greetings
    const normalizedMessage = normalize(userMessage);
    
    const greetingResponses = {
      "who are you": "I am Huduma, an AI assistant specializing in Kenyan legislation and policy information. How can I assist you today?",
      "who are you?": "I am Huduma, an AI assistant specializing in Kenyan legislation and policy information. How can I assist you today?",
      "hello": "Hello! I am Huduma, your legislative information assistant. How can I help you?",
      "hi": "Hi there! I am Huduma, your legislative information assistant. How can I help you?",
      "hey": "Hello! I am Huduma, your legislative information assistant. How can I help you?",
      "how are you": "I'm here to help you with questions about Kenyan legislation and policy. What would you like to know?",
      "how are you?": "I'm here to help you with questions about Kenyan legislation and policy. What would you like to know?",
      "good morning": "Good morning! I am Huduma, your legislative information assistant. How can I help you?",
      "good afternoon": "Good afternoon! I am Huduma, your legislative information assistant. How can I help you?",
      "good evening": "Good evening! I am Huduma, your legislative information assistant. How can I help you?"
    };


    
    // Check for exact matches first (normalized)
    if (greetingResponses[normalizedMessage]) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: greetingResponses[normalizedMessage],
          context: [],
          source: "rule-based"
        }),
      };
    }
    
    // Check for Lino.AI questions (case-insensitive)
    for (const [key, response] of Object.entries(linoAIResponses)) {
      if (normalizedMessage.includes(normalize(key))) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reply: response,
            context: [],
            source: "cached"
          }),
        };
      }
    }

    // Query RAG server without separate health check
    try {
      const ragServerUrl = process.env.RAG_SERVER_URL;
      console.log("RAG_SERVER_URL:", ragServerUrl);
      if (!ragServerUrl) {
        throw new Error("RAG_SERVER_URL not configured");
      }

      const ragUrl = ragServerUrl.replace('/ask', '/rag');
      const ragResponse = await axios.post(
        ragUrl,
        { question: userMessage },
        { timeout: 5000 }
      );

      // If RAG returns an answer, use it immediately.
      if (ragResponse.data && ragResponse.data.answer) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reply: ragResponse.data.answer,
            context: ragResponse.data.context,
            source: "rag"
          }),
        };
      }

      // If RAG has context but no direct answer, pass that context to the LLM.
      const retrievedContext = ragResponse.data && ragResponse.data.context;
      if (retrievedContext) {
        try {
          if (!process.env.OPENROUTER_API_KEY) {
            throw new Error("OPENROUTER_API_KEY not set in environment");
          }
          const systemPrompt = `You are Huduma, an AI assistant specializing in Kenyan legislation and policy information. Your responses must:
1. Be based ONLY on the retrieved context provided
2. Cite specific acts, bills, or policies when they are referenced
3. Say "I don't have enough information about that in my knowledge base" if the context doesn't contain relevant information
4. Be clear and precise, avoiding speculation or inference
5. Focus solely on legislative and policy information
Never identify yourself as an AI model or mention any model providers. Maintain a professional, informative tone.`;
          const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Retrieved context: ${Array.isArray(retrievedContext) ? retrievedContext.join(" ") : retrievedContext}` },
            { role: "user", content: userMessage }
          ];
          const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            { model: "mistralai/mistral-small-3.2-24b-instruct:free", messages },
            {
              headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
              },
              timeout: 3000
            }
          );
          const answer = response.data.choices?.[0]?.message?.content?.trim();
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reply: answer || "Sorry, I do not have official information on that topic.",
              context: retrievedContext,
              source: "rag+llm"
            }),
          };
        } catch (llmError) {
          console.error("LLM fallback error:", llmError);
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reply: "Sorry, I do not have official information on that topic.",
              context: retrievedContext,
              source: "rag+llm-fallback"
            }),
          };
        }
      }
      // If no context or answer from RAG, fall through to broad FAQ LLM fallback handled below.
    } catch (ragError) {
      console.error("RAG error:", ragError);
      // Continue to broad FAQ fallback.
    }
    // Simple fallback for when RAG fails
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY not set in environment");
      }
      const systemPrompt = `You are Huduma, an AI assistant specializing in Kenyan legislation and policy information. Since no context is available for this query:
1. Politely explain that you can only provide information about legislation and policy that is in your knowledge base
2. Suggest that the user try rephrasing their question to focus on specific acts, bills, or policies
3. Maintain a professional, helpful tone
Never identify yourself as an AI model or mention any model providers.`;
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Official information: ${allFaqs}` },
        { role: "user", content: userMessage }
      ];
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "mistralai/mistral-small-3.2-24b-instruct:free",
          messages
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 3000 // 3 seconds timeout for LLM fallback
        }
      );
      const answer = response.data.choices?.[0]?.message?.content?.trim();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: answer || "Sorry, I do not have official information on that topic.",
          context: [],
          source: "llm-fallback"
        }),
      };
    } catch (llmError) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!",
          context: [],
          source: "rule-fallback"
        }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected error", details: error.message }),
    };
  }
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}