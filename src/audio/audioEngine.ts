import type { SoundClip, Slot } from "../store/soundStore";

export type ScheduledSlot = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  clipId: string;
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private slotNodes = new Map<string, ScheduledSlot>();
  private cycleSec = 5;
  private playing = false;

  init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setCycleSec(sec: number) {
    this.cycleSec = sec;
  }

  getCurrentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  getNextStartTime(): number {
    const ctx = this.requireCtx();
    return Math.ceil(ctx.currentTime / this.cycleSec) * this.cycleSec;
  }

  async ensureBuffer(clip: SoundClip): Promise<AudioBuffer> {
    const ctx = this.init();
    const existing = this.buffers.get(clip.id);
    if (existing) {
      return existing;
    }
    const arrayBuffer = await clip.blob.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    this.buffers.set(clip.id, buffer);
    return buffer;
  }

  async play(slots: Slot[], clips: Map<string, SoundClip>) {
    const ctx = this.init();
    await ctx.resume();
    this.stopAllSources();

    const buffers = await Promise.all(
      slots.map(async (slot) => {
        if (!slot.clipId) {
          return null;
        }
        const clip = clips.get(slot.clipId);
        if (!clip) {
          return null;
        }
        const buffer = await this.ensureBuffer(clip);
        return { slot, clipId: clip.id, buffer };
      })
    );

    const startAt = this.getNextStartTime();
    buffers.forEach((entry) => {
      if (!entry) {
        return;
      }
      this.createAndStart(
        entry.slot.slotId,
        entry.clipId,
        entry.buffer,
        startAt,
        entry.slot.volume,
        entry.slot.muted
      );
    });

    this.playing = true;
    return startAt;
  }

  stop() {
    this.stopAllSources();
    this.playing = false;
  }

  async scheduleSlot(slotId: string, clip: SoundClip, volume: number, muted: boolean): Promise<number> {
    const ctx = this.init();
    await ctx.resume();
    const buffer = await this.ensureBuffer(clip);
    const startAt = this.getNextStartTime();
    this.createAndStart(slotId, clip.id, buffer, startAt, volume, muted);
    this.playing = true;
    return startAt;
  }

  stopSlot(slotId: string) {
    const existing = this.slotNodes.get(slotId);
    if (existing) {
      existing.source.stop();
      existing.source.disconnect();
      existing.gain.disconnect();
      this.slotNodes.delete(slotId);
    }
  }

  updateVolume(slotId: string, volume: number, muted: boolean) {
    const existing = this.slotNodes.get(slotId);
    if (existing) {
      existing.gain.gain.value = muted ? 0 : volume;
    }
  }

  private createAndStart(
    slotId: string,
    clipId: string,
    buffer: AudioBuffer,
    startAt: number,
    volume: number,
    muted: boolean
  ) {
    const ctx = this.requireCtx();
    this.stopSlot(slotId);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopEnd = this.cycleSec;
    const gain = ctx.createGain();
    gain.gain.value = muted ? 0 : volume;
    source.connect(gain).connect(ctx.destination);
    source.start(startAt);
    this.slotNodes.set(slotId, { source, gain, clipId });
  }

  private stopAllSources() {
    Array.from(this.slotNodes.keys()).forEach((slotId) => this.stopSlot(slotId));
  }

  private requireCtx(): AudioContext {
    const ctx = this.init();
    if (!ctx) {
      throw new Error("AudioContext not available");
    }
    return ctx;
  }
}
