export const REACT_NATIVE_PROMPT = `# Add Novu to React Native

**Purpose:** Enforce only the **current** and **correct** instructions for integrating [Novu](https://novu.co/) into a React Native application.

**Scope:** All AI-generated advice or code related to Novu must follow these guardrails.

---

## **1. OFFICIAL NOVU + REACT NATIVE SETUP**

### **Install the Novu React Native package**
\`\`\`bash
npm install @novu/react-native
\`\`\`

### **Set up environment variables**
Create or update your environment configuration:
\`\`\`bash
NOVU_APP_IDENTIFIER=your_app_identifier
NOVU_SUBSCRIBER_ID=your_subscriber_id
\`\`\`

### **Add NovuProvider to your app**
Wrap your app with the NovuProvider in your main App component:
\`\`\`tsx
import { NovuProvider } from '@novu/react-native';

export default function App() {
  return (
    <NovuProvider
      subscriberId={process.env.NOVU_SUBSCRIBER_ID!}
      applicationIdentifier={process.env.NOVU_APP_IDENTIFIER!}
    >
      <div style={{ flex: 1 }}>
        <Text>Welcome to my React Native app</Text>
        {/* Your app content */}
      </div>
    </NovuProvider>
  );
}
\`\`\`

### **Add the notification center**
Add the notification center to any component:
\`\`\`tsx
import { NotificationCenter } from '@novu/react-native';

function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Text>Welcome to my app</Text>
      <NotificationCenter />
    </View>
  );
}

export default HomeScreen;
\`\`\`

### **Run your application**
\`\`\`bash
npx react-native run-android
# or
npx react-native run-ios
\`\`\`

---

## **2. CRITICAL INSTRUCTIONS FOR AI MODELS**

### **2.1 – ALWAYS DO THE FOLLOWING**
1. **Use the official @novu/react-native package**
2. **Set up proper environment variables**
3. **Wrap the app with NovuProvider**
4. **Use the NotificationCenter component for displaying notifications**
5. **Follow React Native best practices**

### **2.2 – NEVER DO THE FOLLOWING**
1. **Don't use deprecated package names or imports**
2. **Don't skip the NovuProvider setup**
3. **Don't hardcode API keys or identifiers**
4. **Don't use web-specific features**

---

## **3. VERIFICATION STEPS**

Before returning any Novu + React Native solution, verify:
1. The correct package name (@novu/react-native) is used
2. Environment variables are properly configured
3. NovuProvider wraps the application
4. The solution follows React Native best practices
5. No web-specific patterns are used

---

## **4. RESPONSE TEMPLATE**

When asked about Novu + React Native integration, your response **MUST**:
1. Start with the official package installation
2. Include environment variable setup
3. Show NovuProvider implementation
4. Demonstrate NotificationCenter usage
5. Provide React Native-specific best practices`;
