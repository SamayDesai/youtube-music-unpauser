// Popup script for YouTube Music Auto-Continue extension

document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('toggle');
    const statusText = document.querySelector('.status-text');
    const infoEl = document.getElementById('info');

    // Load persisted enabled state from storage first (so UI is immediate)
    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({enabled: true}, function(items) {
            const enabled = !!items.enabled;
            updateUI(enabled);
            updateInfo(enabled ? 'Auto-continue is active' : 'Auto-continue is disabled');

            // After showing stored state, try to sync with content script if present
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('music.youtube.com')) {
                    sendMessageWithInjection(tabs[0].id, {action: 'getStatus'}, function(response) {
                        if (response) {
                            updateUI(response.enabled);
                            updateInfo(response.enabled ? 'Auto-continue is active' : 'Auto-continue is disabled');
                        } else {
                            // content script missing — will inject when needed on actions
                            updateInfo('Content script not available — injecting when needed');
                        }
                    });
                } else {
                    updateInfo('Open music.youtube.com to enable auto-continue');
                }
            });
        });
    } else {
        // Fallback if storage not available: try the previous behavior
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes('music.youtube.com')) {
                sendMessageWithInjection(tabs[0].id, {action: 'getStatus'}, function(response) {
                    if (response) {
                        updateUI(response.enabled);
                        updateInfo(response.enabled ? 'Auto-continue is active' : 'Auto-continue is disabled');
                    } else {
                        updateUI(false);
                        updateInfo('Content script not available — injecting when needed');
                    }
                });
            } else {
                updateUI(false);
                updateInfo('Open music.youtube.com to enable auto-continue');
            }
        });
    }

    // Handle toggle click (gracefully handle missing content script)
    toggle.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (!(tabs[0] && tabs[0].url && tabs[0].url.includes('music.youtube.com'))) {
                // Nothing to do if not on YouTube Music
                console.info('[popup] Toggle clicked but current tab is not music.youtube.com');
                updateInfo('Open music.youtube.com to use the toggle');
                return;
            }

            // Flip persisted state first (so popup reflects new state immediately)
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get({enabled: true}, function(items) {
                    const newVal = !items.enabled;
                    chrome.storage.local.set({enabled: newVal}, function() {
                        updateUI(newVal);
                        updateInfo(newVal ? 'Auto-continue enabled' : 'Auto-continue disabled');

                                    // Ask background to toggle for all music.youtube.com tabs (background will update storage and notify tabs)
                                    chrome.runtime.sendMessage({from: 'popup', action: 'toggleAll'}, function(response) {
                                        // response may be handled asynchronously by background; UI is already updated
                                    });
                    });
                });
            } else {
                // No storage API — fallback to directly toggling via content script
                sendMessageWithInjection(tabs[0].id, {action: 'toggle'}, function(response) {
                    if (response) {
                        updateUI(response.enabled);
                        updateInfo(response.enabled ? 'Auto-continue enabled' : 'Auto-continue disabled');
                    }
                });
            }
        });
    });

    // Delegate injection/communication responsibilities to the background service worker.
    // When the popup opens, request the background to ensure content scripts are injected in open music.youtube.com tabs.
    function ensureInjectedAcrossTabs() {
        chrome.runtime.sendMessage({from: 'popup', action: 'ensureInjected'}, function(response) {
            if (response && response.ok) {
                updateInfo('Content scripts injected in open tabs');
            } else {
                // background will try; just inform the user
                updateInfo('Ensuring content scripts in open music.youtube.com tabs');
            }
        });
    }

    function updateInfo(text) {
        if (!infoEl) return;
        infoEl.textContent = text || '';
    }

    function updateUI(enabled) {
        if (enabled) {
            toggle.classList.add('active');
            statusText.textContent = 'Enabled';
        } else {
            toggle.classList.remove('active');
            statusText.textContent = 'Disabled';
        }
    }
});