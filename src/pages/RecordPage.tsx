import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SoundCard from "../components/SoundCard";
import { recordOnce } from "../audio/recorder";
import { addClip, deleteClip, getAllClips } from "../store/indexedDb";
import { characters } from "../assets/characters";
import { createId, DEFAULT_CYCLE_SEC, sortClipsByName, SoundClip } from "../store/soundStore";

export default function RecordPage() {
  const [clips, setClips] = useState<SoundClip[]>([]);
  const [recordSec, setRecordSec] = useState<number>(DEFAULT_CYCLE_SEC);
  const [isRecording, setIsRecording] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [pulseTick, setPulseTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const metronomeRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const navigate = useNavigate();
  const character = characters[0];

  useEffect(() => {
    let active = true;
    getAllClips()
      .then((list) => {
        if (active) {
          setClips(sortClipsByName(list));
        }
      })
      .catch(() => setError("おとがよみこめなかったよ"));
    return () => {
      active = false;
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
      }
      if (metronomeRef.current) {
        window.clearInterval(metronomeRef.current);
      }
    };
  }, []);

  const playBeep = (durationSec: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) {
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  };

  const startMetronome = () => {
    if (metronomeRef.current) {
      window.clearInterval(metronomeRef.current);
    }
    const intervalMs = Math.round((60 / 80) * 1000);
    setPulseTick((prev) => prev + 1);
    metronomeRef.current = window.setInterval(() => {
      setPulseTick((prev) => prev + 1);
    }, intervalMs);
  };

  const stopMetronome = () => {
    if (metronomeRef.current) {
      window.clearInterval(metronomeRef.current);
      metronomeRef.current = null;
    }
  };

  const startRecording = async () => {
    if (isRecording || countdown > 0) {
      return;
    }
    setError(null);
    setCountdown(3);
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
    }
    playBeep(0.08);
    setTimeout(() => playBeep(0.08), 1000);
    setTimeout(() => playBeep(0.25), 2000);
    countdownRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            window.clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 3000);
      });
      setIsRecording(true);
      setRemaining(recordSec);
      startMetronome();

      timerRef.current = window.setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const blob = await recordOnce(recordSec);
      const nextIndex = clips.length + 1;
      const clip: SoundClip = {
        id: createId(),
        name: `おと${nextIndex}`,
        blob,
        duration: recordSec
      };
      await addClip(clip);
      setClips((prev) => sortClipsByName([...prev, clip]));
    } catch (err) {
      setError("ろくおんできなかったよ");
    } finally {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopMetronome();
      setIsRecording(false);
      setRemaining(0);
    }
  };

  const handlePlay = (clip: SoundClip) => {
    const url = URL.createObjectURL(clip.blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play().catch(() => {
      URL.revokeObjectURL(url);
    });
  };

  const handleDelete = async (clip: SoundClip) => {
    await deleteClip(clip.id);
    setClips((prev) => prev.filter((item) => item.id !== clip.id));
  };

  return (
    <div className="page record">
      <header className="page-header">
        <h1>ろくおん</h1>
      </header>

      <section className="record-controls">
        <div className="toggle">
          <button
            className={`btn big ${recordSec === 5 ? "active" : ""}`}
            onClick={() => setRecordSec(5)}
            disabled={isRecording}
          >
            5びょう
          </button>
          <button
            className={`btn big ${recordSec === 10 ? "active" : ""}`}
            onClick={() => setRecordSec(10)}
            disabled={isRecording}
          >
            10びょう
          </button>
        </div>

        <button className={`btn huge record ${isRecording ? "active" : ""}`} onClick={startRecording}>
          🔴 ろくおん
        </button>
        {countdown > 0 && <div className="countdown">はじめるよ {countdown}</div>}
        {isRecording && <div className="countdown">のこり {remaining} びょう</div>}
        <div className={`record-pulse ${isRecording ? "active" : ""}`}>
          <div key={`pulse-${pulseTick}`} className="pulse-dot" />
          <div key={`char-${pulseTick}`} className={`pulse-character ${isRecording ? "active" : ""}`}>
            <img src={character.dataUri} alt={`キャラ ${character.name}`} />
          </div>
        </div>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="clip-list">
        <h2>できた おと</h2>
        <div className="card-grid">
          {clips.length === 0 && <p className="empty">まだ おとがないよ</p>}
          {clips.map((clip) => (
            <SoundCard key={clip.id} clip={clip} onPlay={handlePlay} onDelete={handleDelete} />
          ))}
        </div>
      </section>

      <footer className="page-footer">
        <button className="btn huge go" onClick={() => navigate("/mix")}
          disabled={clips.length === 0}
        >
          🎵 つくる
        </button>
      </footer>
    </div>
  );
}
