import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SoundCard from "../components/SoundCard";
import Slot from "../components/Slot";
import Transport from "../components/Transport";
import { AudioEngine } from "../audio/audioEngine";
import { getAllClips, loadMixState, saveMixState } from "../store/indexedDb";
import { characters } from "../assets/characters";
import {
  createDefaultMixState,
  ensureClipIdsExist,
  MixState,
  normalizeMixState,
  sortClipsByName,
  SoundClip
} from "../store/soundStore";

export default function MixPage() {
  const [clips, setClips] = useState<SoundClip[]>([]);
  const [mixState, setMixState] = useState<MixState>(createDefaultMixState());
  const [playing, setPlaying] = useState(false);
  const [pulseTick, setPulseTick] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef(new AudioEngine());
  const timersRef = useRef<Map<string, number>>(new Map());
  const loopTimerRef = useRef<number | null>(null);
  const loopIntervalRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const clipMap = useMemo(() => new Map(clips.map((clip) => [clip.id, clip])), [clips]);

  useEffect(() => {
    let active = true;
    Promise.all([getAllClips(), loadMixState()])
      .then(([clipList, stored]) => {
        if (!active) {
          return;
        }
        const normalized = normalizeMixState(stored);
        const sortedClips = sortClipsByName(clipList);
        const clipIds = new Set(sortedClips.map((clip) => clip.id));
        const cleaned = ensureClipIdsExist(normalized, clipIds);
        setClips(sortedClips);
        setMixState(cleaned);
        setLoaded(true);
      })
      .catch(() => setError("おとがよみこめなかったよ"));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    saveMixState(mixState).catch(() => {
      setError("ほぞんできなかったよ");
    });
  }, [loaded, mixState]);

  const updateSlot = (slotId: string, updater: (slot: MixState["slots"][number]) => MixState["slots"][number]) => {
    setMixState((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) => (slot.slotId === slotId ? updater(slot) : slot))
    }));
  };

  const clearQueueTimer = (slotId: string) => {
    const timer = timersRef.current.get(slotId);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(slotId);
    }
  };

  const stopLoopTicker = () => {
    if (loopTimerRef.current) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    if (loopIntervalRef.current) {
      window.clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
  };

  const startLoopTicker = (startAt: number) => {
    stopLoopTicker();
    const now = engineRef.current.getCurrentTime();
    const delayMs = Math.max(0, (startAt - now) * 1000);
    loopTimerRef.current = window.setTimeout(() => {
      setPulseTick((prev) => prev + 1);
      loopIntervalRef.current = window.setInterval(() => {
        setPulseTick((prev) => prev + 1);
      }, mixState.cycleSec * 1000);
    }, delayMs);
  };

  const handleDrop = async (slotId: string, clipId: string) => {
    const clip = clipMap.get(clipId);
    if (!clip) {
      return;
    }
    const currentSlot = mixState.slots.find((slot) => slot.slotId === slotId);
    if (!currentSlot) {
      return;
    }

    clearQueueTimer(slotId);

    updateSlot(slotId, (slot) => ({
      ...slot,
      clipId,
      queued: playing
    }));

    if (playing) {
      engineRef.current.setCycleSec(mixState.cycleSec);
      const startAt = await engineRef.current.scheduleSlot(
        slotId,
        clip,
        currentSlot.volume,
        currentSlot.muted
      );
      const delayMs = Math.max(0, (startAt - engineRef.current.getCurrentTime()) * 1000);
      if (delayMs > 0) {
        const timer = window.setTimeout(() => {
          updateSlot(slotId, (slot) => ({ ...slot, queued: false }));
          timersRef.current.delete(slotId);
        }, delayMs);
        timersRef.current.set(slotId, timer);
      } else {
        updateSlot(slotId, (slot) => ({ ...slot, queued: false }));
      }
    }
  };

  const handlePlay = async () => {
    setError(null);
    engineRef.current.setCycleSec(mixState.cycleSec);
    const startAt = await engineRef.current.play(mixState.slots, clipMap);
    startLoopTicker(startAt);
    setMixState((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) => ({ ...slot, queued: false }))
    }));
    setPlaying(true);
  };

  const handleStop = () => {
    engineRef.current.stop();
    stopLoopTicker();
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
    setPlaying(false);
    setMixState((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) => ({ ...slot, queued: false }))
    }));
  };

  const handleCycleChange = (value: number) => {
    if (mixState.cycleSec === value) {
      return;
    }
    if (playing) {
      handleStop();
    }
    setMixState((prev) => ({ ...prev, cycleSec: value }));
  };

  useEffect(() => {
    return () => {
      stopLoopTicker();
    };
  }, []);

  return (
    <div className="page mix">
      <header className="page-header">
        <h1>おとをならべる</h1>
        <button className="btn big" onClick={() => navigate("/record")}>
          ⬅ もどる
        </button>
      </header>

      <section className="mix-top">
        <div className="toggle">
          <button
            className={`btn big ${mixState.cycleSec === 5 ? "active" : ""}`}
            onClick={() => handleCycleChange(5)}
          >
            5びょう
          </button>
          <button
            className={`btn big ${mixState.cycleSec === 10 ? "active" : ""}`}
            onClick={() => handleCycleChange(10)}
          >
            10びょう
          </button>
        </div>
        <Transport playing={playing} onPlay={handlePlay} onStop={handleStop} />
        {error && <div className="error">{error}</div>}
      </section>

      <main className="mix-layout">
        <section className="sound-list">
          <h2>おとカード</h2>
          <div className="card-grid">
            {clips.length === 0 && <p className="empty">おとがないよ</p>}
            {clips.map((clip) => (
              <SoundCard key={clip.id} clip={clip} draggable />
            ))}
          </div>
        </section>

        <section className="slot-grid">
          <h2>ならべるところ</h2>
          <div className="slots">
            {mixState.slots.map((slot, index) => {
              const character = characters[index % characters.length];
              return (
              <Slot
                key={slot.slotId}
                slot={slot}
                clipName={slot.clipId ? clipMap.get(slot.clipId)?.name : undefined}
                pulseTick={pulseTick}
                active={playing && Boolean(slot.clipId)}
                characterUri={character.dataUri}
                characterName={character.name}
                onDropClip={(clipId) => handleDrop(slot.slotId, clipId)}
                onRemove={() => {
                  clearQueueTimer(slot.slotId);
                  engineRef.current.stopSlot(slot.slotId);
                  updateSlot(slot.slotId, (current) => ({
                    ...current,
                    clipId: null,
                    queued: false
                  }));
                }}
                onVolumeChange={(value) => {
                  updateSlot(slot.slotId, (current) => ({ ...current, volume: value }));
                  engineRef.current.updateVolume(slot.slotId, value, slot.muted);
                }}
                onMuteToggle={() => {
                  updateSlot(slot.slotId, (current) => {
                    const next = !current.muted;
                    engineRef.current.updateVolume(slot.slotId, current.volume, next);
                    return { ...current, muted: next };
                  });
                }}
              />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
