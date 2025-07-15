import { InboxService } from '../api';

interface VisibilityOptions {
  intersectionThreshold: number; // default: 0.5 (50% visible)
  visibilityDuration: number; // default: 1000ms (1 second)
  batchDelay: number; // default: 500ms
  maxBatchSize: number; // default: 20
  enabled: boolean; // default: true
  rootMargin: string; // default: '0px'
}

const DEFAULT_OPTIONS: VisibilityOptions = {
  intersectionThreshold: 0.5,
  visibilityDuration: 1000,
  batchDelay: 500,
  maxBatchSize: 20,
  enabled: true,
  rootMargin: '0px',
};

export class NotificationVisibilityTracker {
  private seenNotifications = new Set<string>();
  private pendingNotifications = new Map<string, number>();
  private pendingBatch = new Set<string>();
  private batchTimer: number | null = null;
  private observer: IntersectionObserver | null = null;
  private elementToNotificationMap = new WeakMap<Element, string>();
  private options: VisibilityOptions;

  constructor(
    private inboxService: InboxService,
    options: Partial<VisibilityOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initializeObserver();
  }

  private initializeObserver(): void {
    if (!this.options.enabled || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver((entries) => this.handleIntersection(entries), {
      threshold: this.options.intersectionThreshold,
      rootMargin: this.options.rootMargin,
    });
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    const now = Date.now();

    entries.forEach((entry) => {
      const notificationId = this.elementToNotificationMap.get(entry.target);
      if (!notificationId || this.seenNotifications.has(notificationId)) {
        return;
      }

      if (entry.isIntersecting) {
        this.pendingNotifications.set(notificationId, now);
      } else {
        this.pendingNotifications.delete(notificationId);
      }
    });

    // Process notifications that have been visible long enough
    this.processVisibleNotifications();
  }

  private processVisibleNotifications(): void {
    const now = Date.now();
    const notificationsToMark: string[] = [];

    console.log('processVisibleNotifications', this.pendingNotifications);

    this.pendingNotifications.forEach((startTime, notificationId) => {
      console.log(now - startTime, this.options.visibilityDuration);
      if (now - startTime >= this.options.visibilityDuration) {
        notificationsToMark.push(notificationId);
        this.seenNotifications.add(notificationId);
      }
    });

    console.log('notificationsToMark', notificationsToMark);
    // Remove processed notifications from pending
    notificationsToMark.forEach((id) => {
      this.pendingNotifications.delete(id);
    });

    if (notificationsToMark.length > 0) {
      this.addToBatch(notificationsToMark);
    }
  }

  private addToBatch(notificationIds: string[]): void {
    // Add to current batch
    notificationIds.forEach((id) => {
      this.pendingBatch.add(id);
    });

    // Schedule processing if not already scheduled
    this.scheduleBatchProcessing();
  }

  private scheduleBatchProcessing(): void {
    console.log('scheduleBatchProcessing', this.batchTimer);
    if (this.batchTimer !== null) {
      return; // Already scheduled
    }

    this.batchTimer = window.setTimeout(() => {
      console.log('processBatch');
      this.processBatch();
    }, this.options.batchDelay);
  }

  private async processBatch(): Promise<void> {
    this.batchTimer = null;

    // Get all notifications in the pending batch
    const notificationsToSend = Array.from(this.pendingBatch);
    this.pendingBatch.clear();

    if (notificationsToSend.length === 0) {
      return;
    }

    // Process in chunks if batch is too large
    const chunks = this.chunkArray(notificationsToSend, this.options.maxBatchSize);

    try {
      await Promise.all(chunks.map((chunk) => this.inboxService.markAsSeen({ notificationIds: chunk })));
    } catch (error) {
      // On error, remove the failed notifications from seen set so they can be retried
      notificationsToSend.forEach((id) => {
        this.seenNotifications.delete(id);
      });
      console.error('Failed to mark notifications as seen:', error);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }

    return chunks;
  }

  observe(element: Element, notificationId: string): void {
    if (!this.observer || this.seenNotifications.has(notificationId)) {
      return;
    }

    this.elementToNotificationMap.set(element, notificationId);
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    if (!this.observer) {
      return;
    }

    const notificationId = this.elementToNotificationMap.get(element);
    if (notificationId) {
      this.pendingNotifications.delete(notificationId);
      this.pendingBatch.delete(notificationId);
      this.elementToNotificationMap.delete(element);
    }

    this.observer.unobserve(element);
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.batchTimer !== null) {
      window.clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.seenNotifications.clear();
    this.pendingNotifications.clear();
    this.pendingBatch.clear();
  }

  // Force process any pending batches (useful for cleanup)
  async flush(): Promise<void> {
    if (this.batchTimer !== null) {
      window.clearTimeout(this.batchTimer);
      this.batchTimer = null;
      await this.processBatch();
    }
  }
}
