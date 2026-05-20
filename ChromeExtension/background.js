// Handle side panel opening behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received action:', request.action);

  if (request.action === 'capture_tab') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Capture error:', chrome.runtime.lastError.message);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else if (!dataUrl) {
        console.error('Capture returned empty dataUrl');
        sendResponse({ error: 'No data returned from capture' });
      } else {
        console.log('Capture successful, dataUrl length:', dataUrl.length);
        sendResponse({ dataUrl: dataUrl });
      }
    });
    return true; // Keep channel open
  }

  if (request.action === 'region_selected') {
    console.log('Region selected at coords:', request.coords);
    // Relay to sidepanel
    chrome.runtime.sendMessage({ action: 'process_region', coords: request.coords });
  }
});

