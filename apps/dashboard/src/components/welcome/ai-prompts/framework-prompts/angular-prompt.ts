export const ANGULAR_PROMPT = `# Add Novu to Angular

**Purpose:** Enforce only the **current** and **correct** instructions for integrating [Novu](https://novu.co/) into an Angular application.

**Scope:** All AI-generated advice or code related to Novu must follow these guardrails.

---

## **1. OFFICIAL NOVU + ANGULAR SETUP**

### **Install the Novu JavaScript package**
\`\`\`bash
npm install @novu/js
\`\`\`

### **Set up environment variables**
Create or update your \`environment.ts\` file:
\`\`\`typescript
export const environment = {
  production: false,
  novuAppIdentifier: 'your_app_identifier',
  novuSubscriberId: 'your_subscriber_id',
};
\`\`\`

### **Create a Novu service**
Create a service to handle Novu operations:
\`\`\`typescript
import { Injectable } from '@angular/core';
import { Novu } from '@novu/js';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NovuService {
  private novu: Novu;

  constructor() {
    this.novu = new Novu(environment.novuAppIdentifier);
  }

  async initializeSubscriber() {
    await this.novu.subscribers.identify(environment.novuSubscriberId, {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
  }

  showNotificationCenter(elementId: string) {
    this.novu.showNotificationCenter(\`#\${elementId}\`, {
      subscriberId: environment.novuSubscriberId,
    });
  }
}
\`\`\`

### **Add the notification center to a component**
\`\`\`typescript
import { Component, OnInit } from '@angular/core';
import { NovuService } from '../services/novu.service';

@Component({
  selector: 'app-home',
  template: \`
    <div>
      <h1>Welcome to my Angular app</h1>
      <div id="novu-notification-center"></div>
    </div>
  \`
})
export class HomeComponent implements OnInit {
  constructor(private novuService: NovuService) {}

  async ngOnInit() {
    await this.novuService.initializeSubscriber();
    this.novuService.showNotificationCenter('novu-notification-center');
  }
}
\`\`\`

### **Run your application**
\`\`\`bash
ng serve
\`\`\`

---

## **2. CRITICAL INSTRUCTIONS FOR AI MODELS**

### **2.1 – ALWAYS DO THE FOLLOWING**
1. **Use the official @novu/js package**
2. **Set up proper environment configuration**
3. **Create a service to handle Novu operations**
4. **Initialize subscribers before showing notifications**
5. **Follow Angular dependency injection patterns**

### **2.2 – NEVER DO THE FOLLOWING**
1. **Don't use deprecated package names or imports**
2. **Don't skip the service layer**
3. **Don't hardcode API keys or identifiers**
4. **Don't forget to initialize subscribers**

---

## **3. VERIFICATION STEPS**

Before returning any Novu + Angular solution, verify:
1. The correct package name (@novu/js) is used
2. Environment configuration is properly set up
3. A service is created for Novu operations
4. Subscribers are initialized before use
5. The solution follows Angular best practices

---

## **4. RESPONSE TEMPLATE**

When asked about Novu + Angular integration, your response **MUST**:
1. Start with the official package installation
2. Include environment configuration setup
3. Show service creation
4. Demonstrate subscriber initialization
5. Show component integration`;
