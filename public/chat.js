document.addEventListener("DOMContentLoaded", () => {
  // Always hide the loading indicator on page load
  const loadingIndicator = document.getElementById("loading-indicator");
  if (loadingIndicator) loadingIndicator.style.display = "none";
  // DOM Elements
  const sendButton = document.getElementById("send-btn");
  const chatBox = document.getElementById("chat-box");
  const userInputElement = document.getElementById("user-input");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const sidebarClose = document.getElementById("sidebar-close");
  const newChatBtn = document.getElementById("new-chat-btn");
  const conversationsList = document.getElementById("conversations-list");

  // Debug: Check if all elements are found
  console.log("🔍 Element Check:");
  console.log("chatBox:", chatBox);
  console.log("userInputElement:", userInputElement);
  console.log("sendButton:", sendButton);
  console.log("sidebarToggle:", sidebarToggle);
  console.log("sidebar:", sidebar);
  console.log("sidebarClose:", sidebarClose);
  console.log("sidebarBackdrop:", sidebarBackdrop);
  console.log("newChatBtn:", newChatBtn);
  console.log("conversationsList:", conversationsList);

  // State Management
  let activeConversationId = null;
  let conversations = JSON.parse(localStorage.getItem('conversations') || '[]');

  const creatorName = "Ireri Linus Mugendi";

  // Initialize UI
  function initializeUI() {
    console.log("🚀 Initializing UI...");
    
    if (!sendButton || !chatBox || !userInputElement) {
      console.error("Error: Missing UI elements in index.html! Check IDs.");
      return;
    }

    // Event Listeners
    sendButton.addEventListener("click", sendMessage);
    document.getElementById("chat-form").addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage();
    });

    // Sidebar functionality
    sidebarToggle.addEventListener("click", toggleSidebar);
    sidebarClose.addEventListener("click", closeSidebar);
    
    // Mobile-specific new chat button handling
    if (newChatBtn) {
      console.log("Setting up new chat button for mobile...");
      
      // Remove any existing listeners by cloning
      const newChatBtnClone = newChatBtn.cloneNode(true);
      newChatBtn.parentNode.replaceChild(newChatBtnClone, newChatBtn);
      
      // Multiple event handlers for maximum mobile compatibility
      newChatBtnClone.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("New chat CLICKED on mobile");
        createNewConversation();
        return false;
      };
      
      newChatBtnClone.ontouchstart = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("New chat TOUCHED on mobile");
        createNewConversation();
        return false;
      };
      
      newChatBtnClone.ontouchend = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("New chat TOUCH END on mobile");
        createNewConversation();
        return false;
      };
      
      // Also try pointer events for modern browsers
      newChatBtnClone.onpointerdown = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("New chat POINTER DOWN on mobile");
        createNewConversation();
        return false;
      };
    }

    // Mobile keyboard detection
    setupMobileKeyboardDetection();

    // Load conversations
    loadConversations();
    
    // Create initial conversation if none exists
    if (conversations.length === 0) {
      createNewConversation();
    } else {
      // Load the most recent conversation
      loadConversation(conversations[0].id);
    }

    // Test conversation tracking
    console.log("🤖 Chatbot initialized with conversation tracking enabled");
    console.log("📝 Current conversations:", conversations.length);
    console.log("💾 Memory system: Active");
  }

  // Sidebar Toggle
  function toggleSidebar() {
    console.log("Sidebar toggle clicked!");
    // Prevent keyboard from appearing when opening sidebar
    if (document.activeElement === userInputElement) {
      userInputElement.blur();
    }
    
    // Toggle sidebar open/close
    if (sidebar.classList.contains("open")) {
      console.log("Closing sidebar");
      closeSidebar();
    } else {
      console.log("Opening sidebar");
      sidebar.classList.add("open");
      sidebarBackdrop.classList.add("open");
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
  }

  // Close sidebar function
  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarBackdrop.classList.remove("open");
    document.body.style.overflow = '';
  }

  // Close sidebar when clicking the backdrop
  sidebarBackdrop.addEventListener("click", closeSidebar);

  // Conversation Management
  function createNewConversation() {
    console.log("Creating new conversation...");
    const conversationId = Date.now().toString();
    const conversation = {
      id: conversationId,
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    conversations.unshift(conversation);
    saveConversations();
    loadConversation(conversationId);
    renderConversationsList();
    clearChatBox();
    
    console.log("New conversation created:", conversationId);
    console.log("Total conversations:", conversations.length);
    console.log("Current conversation ID:", activeConversationId);
    
    // Close sidebar on mobile after creating new chat
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }

  function loadConversation(conversationId) {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) {
      console.error('Conversation not found:', conversationId);
      return;
    }

    // Clear current chat display
    chatBox.innerHTML = '';
    
    // Update active conversation
    activeConversationId = conversationId;
    
    // Load messages using renderMessages to prevent duplicates
    renderMessages(conversation.messages);
    
    // Update UI
    renderConversationsList();
    closeSidebar();
    
    console.log('Loaded conversation:', conversationId, 'with', conversation.messages.length, 'messages');
  }

  function saveConversation() {
    if (!activeConversationId) return;
    
    const conversation = conversations.find(c => c.id === activeConversationId);
    if (conversation) {
      conversation.updatedAt = new Date().toISOString();
      saveConversations();
    }
  }

  function deleteConversation(conversationId) {
    conversations = conversations.filter(c => c.id !== conversationId);
    saveConversations();
    
    if (activeConversationId === conversationId) {
      if (conversations.length > 0) {
        loadConversation(conversations[0].id);
      } else {
        createNewConversation();
      }
    }
    
    renderConversationsList();
  }

  function updateConversationTitle(conversationId, title) {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.title = title;
      saveConversations();
      renderConversationsList();
    }
  }

  // UI Rendering
  function renderConversationsList() {
    conversationsList.innerHTML = '';
    
    conversations.forEach((conversation, index) => {
      const conversationElement = document.createElement('div');
      conversationElement.className = `conversation-item ${conversation.id === activeConversationId ? 'active' : ''}`;
      conversationElement.setAttribute('data-conversation-id', conversation.id);
      conversationElement.innerHTML = `
        <div class="conversation-info">
          <div class="conversation-title">${conversation.title}</div>
          <div class="conversation-date">${formatDate(conversation.updatedAt)}</div>
        </div>
        <button class="delete-conversation">
          <i class="fas fa-trash"></i>
        </button>
      `;
      
      // Direct mobile event handling for conversation items
      conversationElement.onclick = function(e) {
        // Don't trigger if clicking delete button
        if (e.target.closest('.delete-conversation')) {
          return;
        }
        console.log("Conversation CLICKED on mobile:", conversation.id);
        loadConversation(conversation.id);
        // Close sidebar on mobile after loading
        if (window.innerWidth <= 768) {
          setTimeout(closeSidebar, 100);
        }
        return false;
      };
      
      conversationElement.ontouchstart = function(e) {
        // Don't trigger if clicking delete button
        if (e.target.closest('.delete-conversation')) {
          return;
        }
        console.log("Conversation TOUCHED on mobile:", conversation.id);
        loadConversation(conversation.id);
        // Close sidebar on mobile after loading
        if (window.innerWidth <= 768) {
          setTimeout(closeSidebar, 100);
        }
        return false;
      };
      
      // Delete button handling
      const deleteBtn = conversationElement.querySelector('.delete-conversation');
      if (deleteBtn) {
        deleteBtn.onclick = function(e) {
          e.stopPropagation();
          e.preventDefault();
          console.log("Delete conversation CLICKED:", conversation.id);
          deleteConversation(conversation.id);
          return false;
        };
        
        deleteBtn.ontouchstart = function(e) {
          e.stopPropagation();
          e.preventDefault();
          console.log("Delete conversation TOUCHED:", conversation.id);
          deleteConversation(conversation.id);
          return false;
        };
      }
      
      conversationsList.appendChild(conversationElement);
    });
  }

  function renderMessages(messages) {
    chatBox.innerHTML = '';
    
    // Validate messages array
    if (!Array.isArray(messages)) {
      console.error('Invalid messages array:', messages);
      return;
    }
    
    // Ensure messages are properly structured and unique
    const validMessages = messages.filter((message, index) => {
      if (!message || !message.role || !message.text) {
        console.error('Invalid message structure:', message);
        return false;
      }
      return true;
    });
    
    // Remove duplicates based on content and role
    const uniqueMessages = validMessages.filter((message, index, array) => {
      const previousMessage = array[index - 1];
      if (!previousMessage) return true;
      
      return !(message.role === previousMessage.role && 
               message.text === previousMessage.text);
    });
    
    uniqueMessages.forEach((message, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = `message-wrapper ${message.role}`;

      const msgDiv = document.createElement("div");
      msgDiv.className = `message ${message.role}-message`;
      msgDiv.innerText = message.text.trim();

      wrapper.appendChild(msgDiv);
      chatBox.appendChild(wrapper);
      
      // Add staggered animation for loaded messages
      wrapper.style.opacity = '0';
      wrapper.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        wrapper.style.transition = 'all 0.3s ease';
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'translateY(0)';
      }, index * 50); // Faster stagger
    });
    
    // Ensure proper scrolling after all messages are rendered
    setTimeout(() => {
      scrollChatToBottom();
    }, uniqueMessages.length * 50 + 100);
  }

  function clearChatBox() {
    chatBox.innerHTML = '';
  }

  function updateActiveConversation(conversationId) {
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Find the conversation item with matching ID
    const activeItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
    if (activeItem) {
      activeItem.closest('.conversation-item').classList.add('active');
    }
  }

  // Message Handling
  async function sendMessage() {
    const userMessage = userInputElement.value.trim();
    if (!userMessage || !activeConversationId) return;

    // Input validation and sanitization
    const sanitizedMessage = sanitizeInput(userMessage);
    if (!sanitizedMessage) {
      console.error('Message sanitized to empty string');
      return;
    }

    // Additional validation checks
    if (sanitizedMessage.length > 1000) {
      appendMessage("bot", "Message too long. Please keep your message under 1000 characters.");
      return;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitizedMessage)) {
        console.error('Suspicious input detected:', sanitizedMessage);
        appendMessage("bot", "Invalid input detected. Please try again with a different message.");
        return;
      }
    }

    // Disable input during sending to prevent double-sends
    // But keep it focused to maintain keyboard
    userInputElement.disabled = true;
    sendButton.disabled = true;
    
    // Store current focus state
    const wasFocused = document.activeElement === userInputElement;

    // Add user message to chat and memory
    appendMessage("user", sanitizedMessage);
    addMessageToMemory("user", sanitizedMessage);
    userInputElement.value = "";
    
    // Show typing indicator
    showTypingIndicator(true);

    try {
      // Get conversation context for better responses
      const context = getConversationContext();
      
      // Show memory indicator if there's context
      if (context.length > 1) {
        console.log("🤖 AI is using conversation memory for context-aware response");
      }
      
      let retries = 3;
      let response;
      
      for (let i = 0; i < retries; i++) {
        console.log(`Attempt ${i + 1}: Calling API...`);
        response = await fetch("/.netlify/functions/askai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: sanitizedMessage,
            context: context
          }),
        });

        console.log(`Response status: ${response.status}`);

        if (response.status === 429) {
          console.log(`Rate limited, retrying in ${2 ** i} seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (2 ** i)));
        } else {
          break;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log("API Response:", data);
      console.log("API Response type:", typeof data);
      console.log("API Response keys:", Object.keys(data));
      console.log("data.reply:", data.reply);
      console.log("data.error:", data.error);
      
      const botReply = data.reply || data.error || "Sorry, I didn't get that.";

      appendMessage("bot", botReply);
      addMessageToMemory("bot", botReply);
      showTypingIndicator(false);
      
      // Update conversation title based on first user message
      const conversation = conversations.find(c => c.id === activeConversationId);
      if (conversation && conversation.title === "New Chat") {
        const shortTitle = sanitizedMessage.length > 30 ? sanitizedMessage.substring(0, 30) + "..." : sanitizedMessage;
        updateConversationTitle(activeConversationId, shortTitle);
      }
      
    } catch (error) {
      console.error("Full error details:", error);
      let errorMessage = "Error reaching AI service. Please try again later.";
      
      if (error.message.includes("API configuration error")) {
        errorMessage = "API configuration error. Please check the server setup.";
      } else if (error.message.includes("OpenRouter API error")) {
        errorMessage = "OpenRouter API error. Please check your API key.";
      } else if (error.message.includes("429")) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      }
      
      appendMessage("bot", errorMessage);
      addMessageToMemory("bot", errorMessage);
      showTypingIndicator(false);
    } finally {
      // Re-enable input after sending
      userInputElement.disabled = false;
      sendButton.disabled = false;
      // Keep input focused and maintain position
      setTimeout(() => {
        // Restore focus if it was focused before
        if (wasFocused) {
          userInputElement.focus();
        }
        // Gentle scroll without aggressive positioning
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  }

  function addMessageToMemory(role, content) {
    if (!activeConversationId) return;
    
    const conversation = conversations.find(c => c.id === activeConversationId);
    if (!conversation) return;
    
    // Check for duplicate messages
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage && lastMessage.role === role && lastMessage.text === content) {
      console.log('Preventing duplicate message in memory');
      return;
    }
    
    const message = {
      role: role,
      text: content,
      timestamp: new Date().toISOString()
    };
    
    conversation.messages.push(message);
    saveConversations();
    
    // Log memory status for debugging
    console.log(`💾 Memory updated: ${conversation.messages.length} messages in conversation ${activeConversationId}`);
    
    // Test memory functionality
    if (conversation.messages.length > 1) {
      console.log(`🧠 AI can now reference ${conversation.messages.length - 1} previous messages`);
    }
  }

  function getConversationContext() {
    if (!activeConversationId) return [];
    
    const conversation = conversations.find(c => c.id === activeConversationId);
    if (!conversation) return [];
    
    // Return last 10 messages for context (increased for better memory)
    const context = conversation.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.text
    }));
    
    console.log(`📤 Sending context: ${context.length} messages`);
    return context;
  }

  // Input sanitization function to prevent XSS attacks
  function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove other potentially dangerous HTML tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove data: protocol
      .replace(/data:/gi, '')
      // Remove vbscript: protocol
      .replace(/vbscript:/gi, '')
      // Remove on* event handlers
      .replace(/\bon\w+\s*=/gi, '')
      // Remove excessive whitespace and trim
      .replace(/\s+/g, ' ')
      .trim();
  }

  // UI Helper Functions
  function appendMessage(role, text, saveToMemory = true) {
    // Validate role and text
    if (!role || !text || typeof text !== 'string') {
      console.error('Invalid message data:', { role, text });
      return;
    }

    // Sanitize the text before displaying
    const sanitizedText = sanitizeInput(text);
    if (!sanitizedText) {
      console.error('Message sanitized to empty string');
      return;
    }

    // Clean and trim the text
    const cleanText = sanitizedText.trim();
    if (!cleanText) {
      console.error('Empty message text after trimming');
      return;
    }

    console.log(`Adding ${role} message:`, cleanText.substring(0, 50));

    const wrapper = document.createElement("div");
    wrapper.className = `message-wrapper ${role}`;

    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role}-message`;
    msgDiv.innerText = cleanText; // Use innerText to prevent HTML injection

    wrapper.appendChild(msgDiv);
    chatBox.appendChild(wrapper);
    
    // Ensure proper alignment by forcing a reflow
    wrapper.offsetHeight;
    
    // Add animation class for smooth appearance
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      wrapper.style.transition = 'all 0.3s ease';
      wrapper.style.opacity = '1';
      wrapper.style.transform = 'translateY(0)';
    }, 10);
    
    scrollChatToBottom();
    
    if (saveToMemory) {
      addMessageToMemory(role, cleanText);
    }
  }

  function scrollChatToBottom() {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      if (chatBox) {
        // Force a reflow to ensure proper scrolling
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Additional smooth scroll for better UX
        setTimeout(() => {
          chatBox.scrollTo({ 
            top: chatBox.scrollHeight, 
            behavior: "smooth" 
          });
        }, 50);
      }
    });
    
    // On mobile, ensure input stays visible
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        // Only adjust if input is not focused and sidebar is closed
        if (document.activeElement !== userInputElement && !sidebar.classList.contains("open")) {
          userInputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }

  function showTypingIndicator(show) {
    const indicator = document.getElementById("loading-indicator");
    if (!indicator) return;
    indicator.style.display = show ? "flex" : "none";
  }

  // Utility Functions
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }

  function loadConversations() {
    conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    // Update titles for all conversations with messages but still titled "New Chat"
    conversations.forEach(convo => {
      if (convo.title === "New Chat" && convo.messages && convo.messages.length > 0) {
        // Find the first user message
        const firstUserMsg = convo.messages.find(msg => msg.role === "user");
        if (firstUserMsg) {
          convo.title = firstUserMsg.text.length > 30 ? firstUserMsg.text.substring(0, 30) + "..." : firstUserMsg.text;
        }
      }
    });
    saveConversations();
    renderConversationsList();
  }

  // Make deleteConversation globally accessible
  window.deleteConversation = deleteConversation;

  // Test scrolling functionality
  function testScrolling() {
    // Only check if scrolling is working, no test messages
    if (chatBox) {
      console.log("Mobile scrolling test completed");
    }
  }

  // Mobile Keyboard Detection
  function setupMobileKeyboardDetection() {
    // Optimized focus handling for mobile
    userInputElement.addEventListener("focus", () => {
      // Close sidebar if open when input is focused
      if (sidebar.classList.contains("open")) {
        closeSidebar();
      }
      
      // Immediate scroll to ensure input is visible
      setTimeout(() => {
        scrollChatToBottom();
      }, 50);
    });
    
    // Handle input changes to maintain scroll position
    userInputElement.addEventListener("input", () => {
      // Keep scroll at bottom while typing
      setTimeout(() => {
        scrollChatToBottom();
      }, 10);
    });

    // Prevent form submission on Enter key to avoid page reload
    document.getElementById("chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      sendMessage();
    });

    // Optimize for mobile keyboard
    userInputElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Test function to verify new chat button is working
  function testNewChatButton() {
    console.log("Testing new chat button...");
    const newChatBtn = document.getElementById("new-chat-btn");
    if (newChatBtn) {
      console.log("✅ New chat button found");
      console.log("Button text:", newChatBtn.textContent);
      console.log("Button visible:", newChatBtn.offsetWidth > 0 && newChatBtn.offsetHeight > 0);
      console.log("Is mobile:", window.innerWidth <= 768);
      
      // Add a visual indicator that the button is clickable
      newChatBtn.style.border = "2px solid #F87060";
      setTimeout(() => {
        newChatBtn.style.border = "";
      }, 3000);
    } else {
      console.error("❌ New chat button not found!");
    }
  }

  // Initialize the app
  initializeUI();
  
  // Test scrolling after initialization
  setTimeout(testScrolling, 1000);
  
  // Test new chat button after initialization
  setTimeout(testNewChatButton, 1500);
  
  // Simple mobile functionality test
  setTimeout(() => {
    console.log("Mobile functionality test:");
    console.log("New chat button exists:", !!document.getElementById("new-chat-btn"));
    console.log("Conversations list exists:", !!document.getElementById("conversations-list"));
    console.log("Is mobile:", window.innerWidth <= 768);
  }, 2000);
});