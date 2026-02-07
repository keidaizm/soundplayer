import type { SoundClip } from "../store/soundStore";

type SoundCardProps = {
  clip: SoundClip;
  draggable?: boolean;
  onPlay?: (clip: SoundClip) => void;
  onDelete?: (clip: SoundClip) => void;
  onDragStart?: (clip: SoundClip) => void;
};

export default function SoundCard({
  clip,
  draggable = false,
  onPlay,
  onDelete,
  onDragStart
}: SoundCardProps) {
  return (
    <div
      className={`sound-card ${draggable ? "draggable" : ""}`}
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) {
          return;
        }
        event.dataTransfer.setData("text/plain", clip.id);
        onDragStart?.(clip);
      }}
    >
      <div className="sound-title">{clip.name}</div>
      <div className="sound-actions">
        {onPlay && (
          <button className="btn mini" onClick={() => onPlay(clip)}>
            ▶ きく
          </button>
        )}
        {onDelete && (
          <button className="btn mini danger" onClick={() => onDelete(clip)}>
            🗑 けす
          </button>
        )}
      </div>
    </div>
  );
}
