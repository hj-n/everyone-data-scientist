// Pinch zoom changes the visual viewport, not the page's layout width.
export function updateViewport(previous, { width, height, scale = 1 }) {
  const zoomed = Math.abs(scale - 1) > .01;
  const widthChanged = !previous || Math.abs(width - previous.width) > .5;
  const layoutHeight = previous && zoomed && !widthChanged
    ? previous.height
    : Math.max(300, height * (zoomed ? scale : 1));
  return {
    width,
    height: layoutHeight,
    zoomed,
    changed: !previous || widthChanged || Math.abs(layoutHeight - previous.height) > .5,
  };
}
