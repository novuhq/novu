import { AngularStrategy } from './angular-strategy';
import { FrameworkStrategy } from './framework-strategy';
import { JavaScriptStrategy } from './javascript-strategy';
import { NextJSStrategy } from './nextjs-strategy';
import { ReactNativeStrategy } from './react-native-strategy';
import { ReactStrategy } from './react-strategy';
import { RemixStrategy } from './remix-strategy';
import { VueStrategy } from './vue-strategy';

type SupportedFramework = 'Next.js' | 'React' | 'Angular' | 'Vue' | 'Remix' | 'Native' | 'JavaScript';

const frameworkStrategies = new Map<SupportedFramework, FrameworkStrategy>([
  ['Next.js', new NextJSStrategy()],
  ['React', new ReactStrategy()],
  ['Angular', new AngularStrategy()],
  ['Vue', new VueStrategy()],
  ['Remix', new RemixStrategy()],
  ['Native', new ReactNativeStrategy()],
  ['JavaScript', new JavaScriptStrategy()],
]);

export function getFrameworkStrategy(framework: SupportedFramework | null | undefined): FrameworkStrategy {
  if (!framework) {
    throw new Error('Framework name cannot be empty');
  }

  const strategy = frameworkStrategies.get(framework);
  if (!strategy) {
    throw new Error(`No strategy found for framework: ${framework}`);
  }
  return strategy;
}

export function hasFrameworkStrategy(framework: SupportedFramework | null | undefined): boolean {
  return !!framework && frameworkStrategies.has(framework);
}
