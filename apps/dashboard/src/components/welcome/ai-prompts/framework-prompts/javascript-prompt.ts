export const JAVASCRIPT_PROMPT = `# Add Novu to JavaScript

**Purpose:** Enforce only the **current** and **correct** instructions for integrating [Novu](https://novu.co/) into a JavaScript application.

**Scope:** All AI-generated advice or code related to Novu must follow these guardrails.

---

## **1. OFFICIAL NOVU + JAVASCRIPT SETUP**

### **Install the Novu JavaScript package**
\`\`\`bash
npm install @novu/js
\`\`\`

### **Set up environment variables**
Create or update your environment configuration:
\`\`\`bash
NOVU_APP_IDENTIFIER=your_app_identifier
NOVU_SUBSCRIBER_ID=your_subscriber_id
\`\`\`

### **Initialize Novu in your application**
Set up Novu in your main JavaScript file:
\`\`\`javascript
import { Novu } from '@novu/js';

const novu = new Novu(process.env.NOVU_APP_IDENTIFIER);

// Initialize with subscriber
await novu.subscribers.identify(process.env.NOVU_SUBSCRIBER_ID, {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
});
\`\`\`

### **Add the notification center**
Add the notification center to your HTML:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>My JavaScript App</title>
</head>
<body>
  <div id="app">
    <h1>Welcome to my app</h1>
    <div id="novu-notification-center"></div>
  </div>
  
  <script type="module">
    import { Novu } from '@novu/js';
    
    const novu = new Novu(process.env.NOVU_APP_IDENTIFIER);
    
    // Initialize notification center
    novu.showNotificationCenter('#novu-notification-center', {
      subscriberId: process.env.NOVU_SUBSCRIBER_ID,
    });
  </script>
</body>
</html>
\`\`\`

### **Run your application**
\`\`\`bash
npm run dev
\`\`\`

---

## **2. CRITICAL INSTRUCTIONS FOR AI MODELS**

### **2.1 – ALWAYS DO THE FOLLOWING**
1. **Use the official @novu/js package**
2. **Set up proper environment variables**
3. **Initialize Novu with the correct application identifier**
4. **Identify subscribers before showing notifications**
5. **Use the showNotificationCenter method for displaying notifications**

### **2.2 – NEVER DO THE FOLLOWING**
1. **Don't use deprecated package names or imports**
2. **Don't skip the Novu initialization**
3. **Don't hardcode API keys or identifiers**
4. **Don't forget to identify subscribers**

---

## **3. VERIFICATION STEPS**

Before returning any Novu + JavaScript solution, verify:
1. The correct package name (@novu/js) is used
2. Environment variables are properly configured
3. Novu is properly initialized
4. Subscribers are identified before use
5. The solution follows JavaScript best practices

---

## **4. RESPONSE TEMPLATE**

When asked about Novu + JavaScript integration, your response **MUST**:
1. Start with the official package installation
2. Include environment variable setup
3. Show Novu initialization
4. Demonstrate subscriber identification
5. Show notification center implementation`;
