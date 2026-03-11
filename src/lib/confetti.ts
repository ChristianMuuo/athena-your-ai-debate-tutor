import confetti from "canvas-confetti";

export function fireConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#e8a838", "#f0c060", "#ffd700"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#e8a838", "#f0c060", "#ffd700"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
