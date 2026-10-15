// Start each card at its previous visible rectangle, then take the direct path
// to its new grid slot. The inner card remains free to flip independently.
export function cardTransform(from, to) {
  if (!from || !to || from.width <= 0 || from.height <= 0 || to.width <= 0 || to.height <= 0) return null;
  const x = from.left - to.left, y = from.top - to.top;
  if (Math.max(Math.abs(x), Math.abs(y), Math.abs(from.width - to.width), Math.abs(from.height - to.height)) < .5) return null;
  const round = value => Number(value.toFixed(4));
  return `translate(${round(x)}px, ${round(y)}px) scale(${round(from.width / to.width)}, ${round(from.height / to.height)})`;
}

export function createCardMotion({ reducedMotion, duration = 260 }) {
  const running = new Map();
  const cancel = () => {
    for (const animation of running.values()) animation.cancel();
    running.clear();
  };
  return {
    cancel,
    capture(nodes) {
      const before = new Map();
      if (!reducedMotion()) {
        for (const node of nodes) {
          if (node.isConnected) before.set(node, node.getBoundingClientRect());
        }
      }
      // Read the current animated positions before cancelling, so rapid axis
      // changes continue from the screen position without a snap or a queue.
      cancel();
      return before;
    },
    play(nodes, before) {
      if (reducedMotion()) return;
      const changes = [...nodes].map(node => [node, cardTransform(before.get(node), node.getBoundingClientRect())]);
      for (const [node, transform] of changes) {
        if (!transform || typeof node.animate !== 'function') continue;
        const animation = node.animate([{ transform }, { transform: 'none' }], {
          id: 'card-layout', duration, easing: 'cubic-bezier(.2,.7,.2,1)',
        });
        running.set(node, animation);
        const clean = () => { if (running.get(node) === animation) running.delete(node); };
        animation.onfinish = clean;
        animation.oncancel = clean;
      }
    },
  };
}
