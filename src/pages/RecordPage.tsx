import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SoundCard from "../components/SoundCard";
import { recordOnce } from "../audio/recorder";
import { addClip, deleteClip, getAllClips } from "../store/indexedDb";
import { createId, DEFAULT_CYCLE_SEC, sortClipsByName, SoundClip } from "../store/soundStore";

export default function RecordPage() {
  const [clips, setClips] = useState<SoundClip[]>([]);
  const [recordSec, setRecordSec] = useState<number>(DEFAULT_CYCLE_SEC);
  const [isRecording, setIsRecording] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const navigate = useNavigate();

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
    };
  }, []);

  const startRecording = async () => {
    if (isRecording) {
      return;
    }
    setError(null);
    setIsRecording(true);
    setRemaining(recordSec);

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

    try {
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
        {isRecording && <div className="countdown">のこり {remaining} びょう</div>}
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
