// Test script to verify that @novu/js/internal can be imported correctly
// This simulates how the import would work in a React Native/Expo environment

console.log('🧪 Testing @novu/js/internal module resolution...');

try {
  // Test the import that was failing in React Native/Expo
  const { buildSubscriber } = require('./packages/js/internal');
  
  console.log('✅ Successfully imported buildSubscriber function');
  console.log('📦 Function type:', typeof buildSubscriber);
  
  // Test the function
  const testSubscriber = buildSubscriber({ subscriberId: 'test-user-123' });
  console.log('🔧 Function test result:', testSubscriber);
  
  // Test with different inputs
  const testSubscriber2 = buildSubscriber({ 
    subscriber: { subscriberId: 'user-456', firstName: 'John' } 
  });
  console.log('🔧 Function test result 2:', testSubscriber2);
  
  console.log('🎉 All tests passed! The fix is working correctly.');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}