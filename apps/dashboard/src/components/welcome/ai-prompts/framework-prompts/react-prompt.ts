export const REACT_PROMPT = `# Add Novu to React

**Purpose:** Enforce only the **current** and **correct** instructions for integrating [Novu](https://novu.co/) into a React application.

**Scope:** All AI-generated advice or code related to Novu must follow these guardrails.

---

## **1. OFFICIAL NOVU + REACT SETUP**

### **Install the Novu React package**
\`\`\`bash
npm install @novu/react
\`\`\`

### **Set up environment variables**
Create or update your \`.env\` file:
\`\`\`bash
VITE_NOVU_APP_IDENTIFIER=your_app_identifier
VITE_NOVU_SUBSCRIBER_ID=your_subscriber_id
\`\`\`

### **Add NovuProvider to your app**
Wrap your app with the NovuProvider in your main App component:
\`\`\`tsx
import { NovuProvider } from '@novu/react';

function App() {
  return (
    <NovuProvider
      subscriberId={import.meta.env.VITE_NOVU_SUBSCRIBER_ID}
      applicationIdentifier={import.meta.env.VITE_NOVU_APP_IDENTIFIER}
    >
      <div className="App">
        <h1>Welcome to my React app</h1>
        {/* Your app content */}
      </div>
    </NovuProvider>
  );
}

export default App;
\`\`\`

### **Add the notification center**
Add the notification center to any component:
\`\`\`tsx
import { NotificationCenter } from '@novu/react';

function HomePage() {
  return (
    <div>
      <h1>Welcome to my app</h1>
      <NotificationCenter />
    </div>
  );
}

export default HomePage;
\`\`\`

### **Run your application**
\`\`\`bash
npm run dev
\`\`\`

---

## **2. CRITICAL INSTRUCTIONS FOR AI MODELS**

### **2.1 – ALWAYS DO THE FOLLOWING**
1. **Use the official @novu/react package**
2. **Set up proper environment variables with VITE_ prefix**
3. **Wrap the app with NovuProvider**
4. **Use the NotificationCenter component for displaying notifications**
5. **Follow React hooks best practices**

### **2.2 – NEVER DO THE FOLLOWING**
1. **Don't use deprecated package names or imports**
2. **Don't skip the NovuProvider setup**
3. **Don't hardcode API keys or identifiers**
4. **Don't use client-side only features without proper React patterns**

---

## **3. VERIFICATION STEPS**

Before returning any Novu + React solution, verify:
1. The correct package name (@novu/react) is used
2. Environment variables are properly configured with VITE_ prefix
3. NovuProvider wraps the application
4. The solution follows React best practices
5. No deprecated patterns are used

---

## **4. RESPONSE TEMPLATE**

When asked about Novu + React integration, your response **MUST**:
1. Start with the official package installation
2. Include environment variable setup with VITE_ prefix
3. Show NovuProvider implementation
4. Demonstrate NotificationCenter usage
5. Provide React-specific best practices`;
