// カードを指で左右にはじく操作。タップはめくる扱い。

export function makeSwipeable(card, { onSwipe, onTap, threshold = 90 }) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let dy = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let moved = false;
  let gone = false;

  const setProgress = (x) => {
    const p = Math.max(-1, Math.min(1, x / threshold));
    card.style.setProperty('--know', String(Math.max(0, p)));
    card.style.setProperty('--again', String(Math.max(0, -p)));
  };

  const reset = () => {
    card.style.transition = 'transform 0.25s cubic-bezier(.2,.8,.3,1.2)';
    card.style.transform = '';
    setProgress(0);
  };

  function fling(direction) {
    if (gone) return;
    gone = true;
    const width = Math.max(window.innerWidth, 400);
    card.style.transition = 'transform 0.28s ease-out, opacity 0.28s ease-out';
    card.style.transform = `translate(${direction * width * 1.1}px, ${dy * 0.3}px) rotate(${direction * 22}deg)`;
    card.style.opacity = '0';
    setProgress(direction * threshold);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onSwipe(direction > 0 ? 'right' : 'left');
    };
    card.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 320);
  }

  card.addEventListener('pointerdown', (e) => {
    if (gone || pointerId !== null || e.button > 0) return;
    if (e.target.closest('button, a, input')) return;
    pointerId = e.pointerId;
    startX = lastX = e.clientX;
    startY = e.clientY;
    lastT = e.timeStamp;
    dx = dy = velocity = 0;
    moved = false;
    card.style.transition = 'none';
    try {
      card.setPointerCapture(pointerId);
    } catch {
      /* 古いブラウザ */
    }
  });

  card.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > 8) moved = true;
    const dt = e.timeStamp - lastT;
    if (dt > 0) velocity = (e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastT = e.timeStamp;
    if (moved) {
      card.style.transform = `translate(${dx}px, ${dy * 0.25}px) rotate(${dx / 18}deg)`;
      setProgress(dx);
    }
  });

  const end = (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    if (!moved) {
      reset();
      if (e.type === 'pointerup') onTap?.();
      return;
    }
    const fast = Math.abs(velocity) > 0.6 && Math.abs(dx) > 40 && Math.sign(velocity) === Math.sign(dx);
    if (Math.abs(dx) > threshold || fast) fling(Math.sign(dx));
    else reset();
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);

  return { fling };
}
