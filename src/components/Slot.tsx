import type { Slot as SlotType } from "../store/soundStore";

type SlotProps = {
  slot: SlotType;
  clipName?: string;
  pulseTick: number;
  active: boolean;
  characterUri: string;
  characterName: string;
  onDropClip: (clipId: string) => void;
  onTapDrop?: () => void;
  onRemove: () => void;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
};

export default function Slot({
  slot,
  clipName,
  pulseTick,
  active,
  characterUri,
  characterName,
  onDropClip,
  onTapDrop,
  onRemove,
  onVolumeChange,
  onMuteToggle
}: SlotProps) {
  return (
    <div
      className={`slot ${slot.clipId ? "filled" : "empty"} ${
        slot.queued ? "queued" : ""
      }`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const clipId = event.dataTransfer.getData("text/plain");
        if (clipId) {
          onDropClip(clipId);
        }
      }}
      onClick={() => {
        onTapDrop?.();
      }}
    >
      <div className="slot-label">
        {slot.clipId ? clipName || "おと" : "ここにおと"}
      </div>
      {active ? (
        <div key={`pulse-${pulseTick}`} className="slot-character active">
          <img src={characterUri} alt={`キャラ ${characterName}`} />
        </div>
      ) : (
        <div className="slot-character">
          <img src={characterUri} alt={`キャラ ${characterName}`} />
        </div>
      )}
      <div className="slot-controls">
        <label className="slider-wrap">
          🔊
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={slot.volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            disabled={!slot.clipId}
          />
        </label>
        <button className={`btn mini ${slot.muted ? "muted" : ""}`} onClick={onMuteToggle}>
          🔇
        </button>
        <button className="btn mini danger" onClick={onRemove}>
          ❌
        </button>
      </div>
    </div>
  );
}
