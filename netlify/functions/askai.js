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
      "who are you": "I'm Lino.AI assistant. How can I help you?",
      "who are you?": "I'm Lino.AI assistant. How can I help you?",
      "hello": "Hello! I'm Lino.AI assistant. How can I help you?",
      "hi": "Hi there! I'm Lino.AI assistant. How can I help you?",
      "hey": "Hey! I'm Lino.AI assistant. How can I help you?",
      "how are you": "I'm doing great, thanks for asking! I'm Lino.AI assistant. How can I help you?",
      "how are you?": "I'm doing great, thanks for asking! I'm Lino.AI assistant. How can I help you?",
      "good morning": "Good morning! I'm Lino.AI assistant. How can I help you?",
      "good afternoon": "Good afternoon! I'm Lino.AI assistant. How can I help you?",
      "good evening": "Good evening! I'm Lino.AI assistant. How can I help you?"
    };
    
    // Cached responses for common Lino.AI questions
    const linoAIResponses = {
      "what is lino.ai": "Lino.AI is a technology company led by Ireri Linus Mugendi, specializing in chatbot engineering, AI integration, LLM hosting, fine-tuning, and Retrieval-Augmented Generation (RAG) implementation.",
      "what does lino.ai do": "Lino.AI specializes in chatbot engineering, AI integration, LLM hosting, fine-tuning, Retrieval-Augmented Generation (RAG) implementation using graph knowledge vector databases, website creation, and all aspects of software engineering.",
      "who is lino.ai": "Lino.AI is led by Ireri Linus Mugendi and specializes in AI and software engineering services.",
      "who is ireri linus mugendi": "Ireri Linus Mugendi is the leader of Lino.AI, specializing in AI and software engineering.",
      "contact lino.ai": "You can contact Lino.AI at lino.ai.bot@gmail.com or visit our website at https://lino-ai-co.netlify.app",
      "lino.ai contact": "You can contact Lino.AI at lino.ai.bot@gmail.com or visit our website at https://lino-ai-co.netlify.app",
      "lino.ai services": "Lino.AI offers chatbot engineering, AI integration, LLM hosting, fine-tuning, RAG implementation, website creation, and software engineering services.",
      "lino.ai website": "Visit Lino.AI at https://lino-ai-co.netlify.app",
      "lino.ai email": "Contact Lino.AI at hello.linoai@gmail.com",
      "where did linus school": "Linus attended Lenana School for high school, graduating with an A in mathematics, and is currently pursuing a Bachelor's degree in Mathematics and Computer Science at JKUAT (Jomo Kenyatta University of Agriculture and Technology).",
      "where did linus study": "Linus attended Lenana School and is now at JKUAT studying Mathematics and Computer Science.",
      "where did linus go to school": "Linus went to Lenana School for high school and is currently at JKUAT for university.",
      "what did linus study": "Linus is pursuing a Bachelor's degree in Mathematics and Computer Science at JKUAT.",
      "who is linus": "Linus is a mathematician and AI architect, currently studying at JKUAT and building software solutions.",
      "is linus a mathematician": "Yes, Linus is a mathematician and an AI architect.",
      "which high school did linus attend": "Linus attended Lenana School and graduated with an A in mathematics.",
      "what is linus's background": "Linus is a mathematician and AI architect, currently at JKUAT, and a Lenana School alumnus with an A in mathematics.",
      "was linus a club chairman": "Yes, Linus was the chairman of the Mathematics Club from 2021 to 2023.",
      "what clubs did linus lead": "Linus was the chairman of the Mathematics Club from 2021 to 2023, and is currently the lead of the Data Science and Cloud Computing team at JKUAT.",
      "what is linus's role in jkuat": "Linus is the lead of the Data Science and Cloud Computing team at JKUAT.",
      "what is lino ai's history": "Linus began Lino AI in 2024, but officially decided to implement it in 2025.",
      "when was lino ai started": "Lino AI was started by Linus in 2024, with official implementation beginning in 2025.",
      "who leads data science at jkuat": "Linus is the lead of the Data Science and Cloud Computing team at JKUAT.",
      "who was mathematics club chairman": "Linus was the chairman of the Mathematics Club from 2021 to 2023."
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
          const systemPrompt = `You are Lino.AI Assistant. Only identify yourself as Lino.AI Assistant if the user explicitly asks who you are or similar. Never say you are a language model, AI model, or mention Mistral or any other provider. Never say you were created by Mistral or anyone else. You must answer using ONLY the retrieved context provided below. Do not speculate or invent information.`;
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
    // FAQ/cached info fallback (outermost catch block)
    const allFaqs = [
      ...Object.values(greetingResponses),
      ...Object.values(linoAIResponses)
    ].join(" ");
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY not set in environment");
      }
      const systemPrompt = `You are Lino.AI Assistant. Only identify yourself as Lino.AI Assistant if the user explicitly asks who you are or similar. Never say you are a language model, AI model, or mention Mistral or any other provider. Never say you were created by Mistral or anyone else. You must answer using ONLY the official information provided below. Do not speculate, do not introduce yourself, do not use general knowledge, and do not say you don't know if the information is present. If the information is not present, say you do not have official information. Always try to follow up on the current conversation and maintain context if possible.`;
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