export type SoundClip = {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
};

export type Slot = {
  slotId: string;
  clipId: string | null;
  volume: number;
  muted: boolean;
  queued: boolean;
};

export type MixState = {
  cycleSec: number;
  slots: Slot[];
};

export const DEFAULT_CYCLE_SEC = 5;
export const SLOT_COUNT = 8;

export function createDefaultSlots(): Slot[] {
  return Array.from({ length: SLOT_COUNT }).map((_, index) => ({
    slotId: `slot-${index + 1}`,
    clipId: null,
    volume: 1,
    muted: false,
    queued: false
  }));
}

export function createDefaultMixState(cycleSec = DEFAULT_CYCLE_SEC): MixState {
  return {
    cycleSec,
    slots: createDefaultSlots()
  };
}

export function normalizeMixState(state: MixState | null): MixState {
  if (!state) {
    return createDefaultMixState();
  }
  const slots = [...state.slots];
  if (slots.length < SLOT_COUNT) {
    const missing = SLOT_COUNT - slots.length;
    for (let i = 0; i < missing; i += 1) {
      slots.push({
        slotId: `slot-${slots.length + 1}`,
        clipId: null,
        volume: 1,
        muted: false,
        queued: false
      });
    }
  }
  if (slots.length > SLOT_COUNT) {
    slots.length = SLOT_COUNT;
  }
  return {
    cycleSec: state.cycleSec ?? DEFAULT_CYCLE_SEC,
    slots: slots.map((slot, index) => ({
      slotId: slot.slotId || `slot-${index + 1}`,
      clipId: slot.clipId ?? null,
      volume: Number.isFinite(slot.volume) ? slot.volume : 1,
      muted: Boolean(slot.muted),
      queued: Boolean(slot.queued)
    }))
  };
}

export function ensureClipIdsExist(state: MixState, clipIds: Set<string>): MixState {
  const slots = state.slots.map((slot) => {
    if (slot.clipId && !clipIds.has(slot.clipId)) {
      return { ...slot, clipId: null, queued: false };
    }
    return slot;
  });
  return { ...state, slots };
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `clip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sortClipsByName(clips: SoundClip[]): SoundClip[] {
  const getNumber = (name: string) => {
    const match = name.match(/(\d+)/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };
  return [...clips].sort((a, b) => {
    const numA = getNumber(a.name);
    const numB = getNumber(b.name);
    if (numA !== numB) {
      return numA - numB;
    }
    return a.name.localeCompare(b.name, "ja");
  });
}
