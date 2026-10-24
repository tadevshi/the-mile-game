import { afterEach, describe, expect, it } from 'vitest';
import { useEventStore } from './eventStore';

const event = {
  id: 'event-1',
  slug: 'birthday',
  name: 'Birthday',
  features: { quiz: true, corkboard: true, secretBox: false },
  isActive: true,
  settings: { postcard_style: 'classic' as const },
};

afterEach(() => useEventStore.getState().clearEvent());

describe('eventStore settings synchronization', () => {
  it('updates settings for the current event after an admin save', () => {
    useEventStore.getState().setEvent(event);

    useEventStore.getState().syncSettings('birthday', { postcard_style: 'polaroid' });

    expect(useEventStore.getState().currentEvent?.settings?.postcard_style).toBe('polaroid');
  });

  it('does not update a different event', () => {
    useEventStore.getState().setEvent(event);

    useEventStore.getState().syncSettings('another-event', { postcard_style: 'polaroid' });

    expect(useEventStore.getState().currentEvent?.settings?.postcard_style).toBe('classic');
  });
});
