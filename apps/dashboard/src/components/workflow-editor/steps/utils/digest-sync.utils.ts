export function synchronizeDigestStepData(updatedData: any, previousData: any, payloadExample?: any): any {
  // Check if both eventCount and events exist
  if (!('eventCount' in updatedData && 'events' in updatedData)) {
    return updatedData;
  }

  const prevEventCount = previousData?.eventCount ?? 0;
  const prevEvents = previousData?.events ?? [];
  const currentEventCount = updatedData.eventCount;
  const currentEvents = updatedData.events;

  // Case 1: eventCount changed
  if (currentEventCount !== prevEventCount) {
    const newCount = Math.max(0, parseInt(currentEventCount) || 0);
    let syncedEvents = [...(currentEvents || [])];

    if (newCount > syncedEvents.length) {
      // Add placeholder events
      while (syncedEvents.length < newCount) {
        syncedEvents.push(generatePlaceholderEvent(syncedEvents.length, payloadExample));
      }
    } else if (newCount < syncedEvents.length) {
      // Trim events array
      syncedEvents = syncedEvents.slice(0, newCount);
    }

    return { ...updatedData, eventCount: newCount, events: syncedEvents };
  }

  // Case 2: events array changed
  if (Array.isArray(currentEvents) && currentEvents.length !== prevEvents.length) {
    return { ...updatedData, eventCount: currentEvents.length };
  }

  return updatedData;
}

function generatePlaceholderEvent(index: number, payloadExample?: any) {
  // Generate a placeholder event structure using the server's payload example
  const baseTime = new Date();
  baseTime.setMinutes(baseTime.getMinutes() - index * 5); // Stagger events by 5 minutes

  return {
    id: `event-${Date.now()}-${index + 1}`,
    time: baseTime.toISOString(),
    payload: payloadExample || {},
  };
}
