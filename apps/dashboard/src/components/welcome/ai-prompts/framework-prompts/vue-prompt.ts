export const VUE_PROMPT = `# Add Novu to Vue

**Purpose:** Enforce only the **current** and **correct** instructions for integrating [Novu](https://novu.co/) into a Vue application.

**Scope:** All AI-generated advice or code related to Novu must follow these guardrails.

---

## **1. OFFICIAL NOVU + VUE SETUP**

### **Install the Novu JavaScript package**
\`\`\`bash
npm install @novu/js
\`\`\`

### **Set up environment variables**
Create or update your \`.env\` file:
\`\`\`bash
VITE_NOVU_APP_IDENTIFIER=your_app_identifier
VITE_NOVU_SUBSCRIBER_ID=your_subscriber_id
\`\`\`

### **Create a Novu composable**
Create a composable to handle Novu operations:
\`\`\`typescript
import { ref } from 'vue';
import { Novu } from '@novu/js';

export function useNovu() {
  const novu = ref<Novu | null>(null);
  const isInitialized = ref(false);

  const initialize = async () => {
    const appIdentifier = import.meta.env.VITE_NOVU_APP_IDENTIFIER;
    const subscriberId = import.meta.env.VITE_NOVU_SUBSCRIBER_ID;
    
    novu.value = new Novu(appIdentifier);
    
    await novu.value.subscribers.identify(subscriberId, {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
    
    isInitialized.value = true;
  };

  const showNotificationCenter = (elementId: string) => {
    if (!novu.value || !isInitialized.value) return;
    
    const subscriberId = import.meta.env.VITE_NOVU_SUBSCRIBER_ID;
    novu.value.showNotificationCenter(\`#\${elementId}\`, {
      subscriberId,
    });
  };

  return {
    initialize,
    showNotificationCenter,
    isInitialized,
  };
}
\`\`\`

### **Add the notification center to a component**
\`\`\`vue
<template>
  <div>
    <h1>Welcome to my Vue app</h1>
    <div id="novu-notification-center"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useNovu } from '../composables/useNovu';

const { initialize, showNotificationCenter } = useNovu();

onMounted(async () => {
  await initialize();
  showNotificationCenter('novu-notification-center');
});
</script>
\`\`\`

### **Run your application**
\`\`\`bash
npm run dev
\`\`\`

---

## **2. CRITICAL INSTRUCTIONS FOR AI MODELS**

### **2.1 – ALWAYS DO THE FOLLOWING**
1. **Use the official @novu/js package**
2. **Set up proper environment variables with VITE_ prefix**
3. **Create a composable for Novu operations**
4. **Initialize subscribers before showing notifications**
5. **Follow Vue 3 Composition API patterns**

### **2.2 – NEVER DO THE FOLLOWING**
1. **Don't use deprecated package names or imports**
2. **Don't skip the composable layer**
3. **Don't hardcode API keys or identifiers**
4. **Don't forget to initialize subscribers**

---

## **3. VERIFICATION STEPS**

Before returning any Novu + Vue solution, verify:
1. The correct package name (@novu/js) is used
2. Environment variables are properly configured with VITE_ prefix
3. A composable is created for Novu operations
4. Subscribers are initialized before use
5. The solution follows Vue 3 best practices

---

## **4. RESPONSE TEMPLATE**

When asked about Novu + Vue integration, your response **MUST**:
1. Start with the official package installation
2. Include environment variable setup with VITE_ prefix
3. Show composable creation
4. Demonstrate subscriber initialization
5. Show component integration`;
