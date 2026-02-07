export async function recordOnce(durationSec: number): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const stopPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, {
        type: recorder.mimeType || "audio/webm"
      });
      stream.getTracks().forEach((track) => track.stop());
      resolve(blob);
    };
  });

  recorder.start();
  setTimeout(() => {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, durationSec * 1000);

  return stopPromise;
}
