let startX, startY, isDrawing = false;
let overlay, selection;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start_selection') {
    createOverlay();
    return true;
  }
});

function createOverlay() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'analyze-screen-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.3);
    cursor: crosshair;
    z-index: 2147483647;
  `;

  selection = document.createElement('div');
  selection.id = 'analyze-screen-selection';
  selection.style.cssText = `
    position: absolute;
    border: 2px solid #007aff;
    background: rgba(0,122,255,0.1);
    pointer-events: none;
    display: none;
  `;

  overlay.appendChild(selection);
  document.body.appendChild(overlay);

  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);
  
  // Handle Escape key to cancel
  document.addEventListener('keydown', onKeyDown);
}

function onMouseDown(e) {
  isDrawing = true;
  startX = e.clientX;
  startY = e.clientY;
  selection.style.display = 'block';
  selection.style.left = startX + 'px';
  selection.style.top = startY + 'px';
  selection.style.width = '0px';
  selection.style.height = '0px';
}

function onMouseMove(e) {
  if (!isDrawing) return;
  const currentX = e.clientX;
  const currentY = e.clientY;
  
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const w = Math.abs(startX - currentX);
  const h = Math.abs(startY - currentY);
  
  selection.style.left = x + 'px';
  selection.style.top = y + 'px';
  selection.style.width = w + 'px';
  selection.style.height = h + 'px';
}

function onMouseUp(e) {
  if (!isDrawing) return;
  isDrawing = false;
  
  const rect = selection.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  const coords = {
    x: rect.left * dpr,
    y: rect.top * dpr,
    w: rect.width * dpr,
    h: rect.height * dpr,
    dpr: dpr
  };
  
  removeOverlay();
  
  if (coords.w > 5 && coords.h > 5) {
    chrome.runtime.sendMessage({ action: 'region_selected', coords: coords });
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    removeOverlay();
  }
}

function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
    selection = null;
    document.removeEventListener('keydown', onKeyDown);
  }
}
