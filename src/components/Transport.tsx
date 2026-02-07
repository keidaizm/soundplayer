type TransportProps = {
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
};

export default function Transport({ playing, onPlay, onStop }: TransportProps) {
  return (
    <div className="transport">
      {playing ? (
        <button className="btn big stop" onClick={onStop}>
          ■ とめる
        </button>
      ) : (
        <button className="btn big play" onClick={onPlay}>
          ▶ さいせい
        </button>
      )}
    </div>
  );
}
