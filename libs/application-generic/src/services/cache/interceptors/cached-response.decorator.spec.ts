import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../cache.service';
import { CachedResponse } from './cached-response.decorator';

// Mock class to demonstrate the decorator
class TestClass {
  @CachedResponse({
    builder: (...args) => `test-key-${args[0]}`,
    options: {
      skipCache: (arg) => arg === 'skip',
      skipSaveToCache: (response) => response === null,
    },
  })
  async testMethod(input: string): Promise<string | null> {
    return input === 'null' ? null : `processed-${input}`;
  }
}

describe('CachedResponse Decorator', () => {
  let testInstance: TestClass;
  let mockCacheService: {
    cacheEnabled: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
  };

  beforeEach(async () => {
    // Create mock for CacheService
    mockCacheService = {
      cacheEnabled: jest.fn().mockReturnValue(true),
      get: jest.fn(),
      set: jest.fn(),
    };

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestClass,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    // Get the test instance
    testInstance = module.get(TestClass);
  });

  it('should execute original method when cache is disabled', async () => {
    // Arrange
    mockCacheService.cacheEnabled.mockReturnValue(false);
    const spy = jest.spyOn(testInstance, 'testMethod');

    // Act
    const result = await testInstance.testMethod('test');

    // Assert
    expect(result).toBe('processed-test');
    expect(spy).toHaveBeenCalledWith('test');
    expect(mockCacheService.get).not.toHaveBeenCalled();
  });

  it('should skip cache when skipCache condition is met', async () => {
    // Arrange
    const spy = jest.spyOn(testInstance, 'testMethod');

    // Act
    const result = await testInstance.testMethod('skip');

    // Assert
    expect(result).toBe('processed-skip');
    expect(spy).toHaveBeenCalledWith('skip');
    expect(mockCacheService.get).not.toHaveBeenCalled();
  });

  it('should retrieve from cache when value exists', async () => {
    // Arrange
    mockCacheService.get.mockResolvedValue('cached-value');

    // Act
    const result = await testInstance.testMethod('test');

    // Assert
    expect(result).toBe('cached-value');
    expect(mockCacheService.get).toHaveBeenCalledWith('test-key-test');
    expect(mockCacheService.set).not.toHaveBeenCalled();
  });

  it('should save to cache when value not found', async () => {
    // Arrange
    mockCacheService.get.mockResolvedValue(null);

    // Act
    const result = await testInstance.testMethod('test');

    // Assert
    expect(result).toBe('processed-test');
    expect(mockCacheService.get).toHaveBeenCalledWith('test-key-test');
    expect(mockCacheService.set).toHaveBeenCalledWith('test-key-test', 'processed-test', expect.any(Object));
  });

  it('should skip saving to cache when skipSaveToCache returns true', async () => {
    // Arrange
    mockCacheService.get.mockResolvedValue(null);

    // Act
    const result = await testInstance.testMethod('null');

    // Assert
    expect(result).toBeNull();
    expect(mockCacheService.get).toHaveBeenCalledWith('test-key-null');
    expect(mockCacheService.set).not.toHaveBeenCalled();
  });

  it('should handle cache retrieval errors gracefully', async () => {
    // Arrange
    mockCacheService.get.mockRejectedValue(new Error('Cache error'));
    const spy = jest.spyOn(testInstance, 'testMethod');

    // Act
    const result = await testInstance.testMethod('test');

    // Assert
    expect(result).toBe('processed-test');
    expect(spy).toHaveBeenCalledWith('test');
  });
});
