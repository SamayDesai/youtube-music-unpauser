// Background service worker for YouTube Music Auto-Continue
// Responsible for ensuring content script is injected into music.youtube.com tabs
// and relaying toggle/getStatus messages to those tabs.

// Helper: get all YouTube Music tabs
async function getMusicTabs() {
    return await chrome.tabs.query({url: '*://music.youtube.com/*'});
}

// Inject content script into a tab if not already present by trying to send a message
async function ensureContentScript(tabId) {
    try {
        const response = await chrome.runtime.sendMessage({__probe: true});
        // If we get a response, background probably exists in page context — but content scripts don't reply to runtime.sendMessage to background like that.
    } catch (e) {
        // ignore
    }

    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, {action: 'ping'}, function(resp) {
            if (chrome.runtime && chrome.runtime.lastError) {
                // No content script listener, inject
                chrome.scripting.executeScript({
                    target: {tabId: tabId},
                    files: ['content.js']
                }, function() {
                    // After injection, send an init message to sync storage state
                    chrome.storage.local.get({enabled: true}, function(items) {
                        chrome.tabs.sendMessage(tabId, {action: 'setEnabled', enabled: !!items.enabled}, function() {
                            resolve(true);
                        });
                    });
                });
                return;
            }

            // Content script present; also make sure it has the correct enabled state
            chrome.storage.local.get({enabled: true}, function(items) {
                chrome.tabs.sendMessage(tabId, {action: 'setEnabled', enabled: !!items.enabled}, function() {
                    resolve(true);
                });
            });
        });
    });
}

// Ensure content script is present in all music.youtube.com tabs
async function ensureAllTabsHaveScript() {
    const tabs = await getMusicTabs();
    for (const tab of tabs) {
        try {
            await ensureContentScript(tab.id);
        } catch (e) {
            console.warn('Failed to ensure content script for tab', tab.id, e);
        }
    }
}

// On install/update, try to inject into existing music.youtube.com tabs
chrome.runtime.onInstalled.addListener(() => {
    ensureAllTabsHaveScript();
});

// When storage changes (toggle), notify all content scripts
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.enabled) {
        const newVal = changes.enabled.newValue;
        getMusicTabs().then(tabs => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, {action: 'setEnabled', enabled: !!newVal});
            }
        });
    }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.from === 'popup' && message.action === 'ensureInjected') {
        // Ensure content script in all music tabs and respond
        ensureAllTabsHaveScript().then(() => sendResponse({ok: true}));
        // return true to indicate we'll respond asynchronously
        return true;
    }

    if (message && message.from === 'popup' && message.action === 'toggleAll') {
        // Flip stored enabled value and notify tabs
        chrome.storage.local.get({enabled: true}, function(items) {
            const newVal = !items.enabled;
            chrome.storage.local.set({enabled: newVal}, function() {
                // notify all tabs
                getMusicTabs().then(tabs => {
                    for (const tab of tabs) {
                        chrome.tabs.sendMessage(tab.id, {action: 'setEnabled', enabled: !!newVal});
                    }
                });
                sendResponse({enabled: newVal});
            });
        });
        return true;
    }

    // If a content script pings us, reply so ensureContentScript can detect presence
    if (message && message.action === 'ping' && sender && sender.tab) {
        sendResponse({pong: true});
        return true;
    }

    return false;
});

// Periodically ensure content scripts are injected (covers newly opened tabs)
chrome.alarms.create('ensureScripts', {periodInMinutes: 1});
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'ensureScripts') {
        ensureAllTabsHaveScript();
    }
});
