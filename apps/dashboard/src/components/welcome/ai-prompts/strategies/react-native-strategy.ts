import type { NovuConfig, SetupStep } from '../types';
import { BaseFrameworkStrategy, Environment } from './framework-strategy';

export class ReactNativeStrategy extends BaseFrameworkStrategy {
  constructor() {
    super({
      envVarName: 'EXPO_PUBLIC_NOVU_APP_IDENTIFIER',
      envFileName: '.env',
      packageName: '@novu/react-native',
      docsUrl: 'https://docs.novu.co/platform/inbox/react-native',
    });
  }

  private validatedEnv: Environment = {};

  validateEnvironment(env: Environment, requireCredentials: boolean = false) {
    const validation = this.validateRequiredVars(env, requireCredentials);
    if (validation.isValid) {
      this.validatedEnv = env;
    }
    return validation;
  }

  generateSetupSteps(env: Environment): SetupStep[] {
    const { subscriberId, backendUrl, socketUrl } = env;
    const validation = this.validateEnvironment(env, true); // Require credentials for code generation

    if (!validation.isValid) {
      throw new Error(
        `Missing required environment variables: ${validation.missingVars.join(', ')}. Please provide all required values.`
      );
    }

    const steps: SetupStep[] = [];

    // Add environment variable setup step
    steps.push({
      title: `Set environment variables in ${this.config.envFileName}`,
      code: this.getEnvSetupCode(env),
      notes: [
        `${this.config.envVarName}: Found in the Novu dashboard under **API Keys**.`,
        'Subscriber ID: Generated from your authentication system or provided for testing.',
        ...(backendUrl ? ['Backend URL: Custom Novu backend endpoint.'] : []),
        ...(socketUrl ? ['Socket URL: Custom Novu WebSocket endpoint.'] : []),
        'Make sure to restart your development server after adding environment variables.',
        'Use EXPO_PUBLIC_ prefix for Expo public environment variables.',
      ],
    });

    // Add component implementation step
    steps.push({
      title: 'Add the notification Inbox to your app',
      description: 'Implement the notification center in your React Native application:',
      code: `// App.tsx
import { NovuProvider } from '@novu/react-native';
import { NotificationCenter } from './NotificationCenter';

// Function to generate temporary subscriber ID for testing using cryptographically secure random UUID
function getTemporarySubscriberId(): string {
  return 'user-' + crypto.randomUUID();
}

export default function App() {
  const appIdentifier = Constants.expoConfig?.extra?.EXPO_PUBLIC_NOVU_APP_IDENTIFIER || Constants.manifest?.extra?.EXPO_PUBLIC_NOVU_APP_IDENTIFIER;
  if (!appIdentifier) {
    console.error('EXPO_PUBLIC_NOVU_APP_IDENTIFIER is not set');
    return null;
  }

  return (
    <NovuProvider
      applicationIdentifier="${this.escapeForDoubleQuotes(this.validatedEnv.applicationIdentifier)}"
      subscriberId="${this.escapeForDoubleQuotes(subscriberId)}"${this.getConfigTemplate({
        backendUrl,
        socketUrl,
        applicationIdentifier: this.validatedEnv.applicationIdentifier || '',
        subscriberId: subscriberId || '',
      })}
    >
      <NotificationCenter />
    </NovuProvider>
  );
}

// NotificationCenter.tsx
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useNotifications } from '@novu/react-native';

export function NotificationCenter() {
  const { notifications, isLoading, fetchMore, hasMore, refetch } = useNotifications();

  const renderItem = ({ item }) => {
    if (!item) return null;
    
    return (
      <View style={styles.notificationItem}>
        <Text>{item.body || 'No content available'}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text>No updates available</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      onEndReached={fetchMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          colors={['#2196F3']}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});`,
      notes: [
        'The NovuProvider wraps your app components.',
        'The useNotifications hook provides access to notifications data.',
        'For production: Replace with dynamic ID from your authentication solution.',
        'Common patterns: useAuth().user?.id, currentUser?.id, etc.',
        "Note: subscriberId comes from your app's authentication, not from the Novu dashboard.",
        'Region configuration is automatically included for EU users only.',
        'Implement proper loading and error states for better UX.',
      ],
    });

    return steps;
  }

  getConfigTemplate(config: NovuConfig): string {
    const configEntries = Object.entries(config)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]: [string, string | undefined]) => `\n      ${key}="${this.escapeForDoubleQuotes(value)}"`);

    return configEntries.join('');
  }

  getEnvSetupCode(env: Environment): string {
    const { applicationIdentifier, subscriberId, backendUrl, socketUrl } = env;
    const validation = this.validateEnvironment(env);

    if (!validation.isValid) {
      throw new Error(
        `Missing required environment variables: ${validation.missingVars.join(', ')}. Please provide all required values.`
      );
    }

    const envVars = [
      `${this.config.envVarName}=${this.escapeForDoubleQuotes(applicationIdentifier)}`,
      `EXPO_PUBLIC_NOVU_SUBSCRIBER_ID=${this.escapeForDoubleQuotes(subscriberId)}`,
      ...(backendUrl ? [`EXPO_PUBLIC_NOVU_BACKEND_URL=${this.escapeForDoubleQuotes(backendUrl)}`] : []),
      ...(socketUrl ? [`EXPO_PUBLIC_NOVU_SOCKET_URL=${this.escapeForDoubleQuotes(socketUrl)}`] : []),
    ];

    return envVars.join('\n');
  }

  getEnvValidationCode(_envAccess: string): string {
    return `const appIdentifier = Constants.expoConfig?.extra?.EXPO_PUBLIC_NOVU_APP_IDENTIFIER || Constants.manifest?.extra?.EXPO_PUBLIC_NOVU_APP_IDENTIFIER;
if (!appIdentifier) {
  console.error('EXPO_PUBLIC_NOVU_APP_IDENTIFIER is not set');
  return null;
}`;
  }
}
