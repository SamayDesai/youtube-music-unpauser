// YouTube Music Auto-Continue Extension
// Automatically clicks "Yes" when the "Continue watching?" popup appears

(function() {
    'use strict';

    let isEnabled = true;
    let observer = null;

    // Load persisted enabled state from storage (MV3 chrome.storage.local)
    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({enabled: true}, function(items) {
            isEnabled = !!items.enabled;
            console.log('[YouTube Music Auto-Continue] Loaded enabled state from storage:', isEnabled);
        });
    }

    // Function to find and click the "Yes" button
    function clickContinueButton() {
        // Multiple selectors to find the "Yes" button
        const selectors = [
            // Common YouTube Music popup button selectors
            'button[aria-label*="Yes"]',
            'button:contains("Yes")',
            'tp-yt-paper-button:contains("Yes")',
            'yt-button-renderer:contains("Yes")',
            // Generic continue/yes button selectors
            'button[data-action="continue"]',
            '[role="button"]:contains("Yes")',
            '.continue-button',
            '.yes-button'
        ];

        for (let selector of selectors) {
            try {
                // Handle :contains() pseudo-selector manually
                if (selector.includes(':contains(')) {
                    const baseSelector = selector.split(':contains(')[0];
                    const searchText = selector.match(/contains\("(.+?)"\)/)[1];

                    const elements = document.querySelectorAll(baseSelector);
                    for (let element of elements) {
                        if (element.textContent.toLowerCase().includes(searchText.toLowerCase())) {
                            console.log('[YouTube Music Auto-Continue] Found and clicking continue button:', element);
                            element.click();
                            return true;
                        }
                    }
                } else {
                    const button = document.querySelector(selector);
                    if (button && button.offsetParent !== null) { // Check if button is visible
                        console.log('[YouTube Music Auto-Continue] Found and clicking continue button:', button);
                        button.click();
                        return true;
                    }
                }
            } catch (e) {
                // Continue to next selector if this one fails
                continue;
            }
        }

        // Fallback: Look for any button with "Yes" text in a dialog
        const dialogs = document.querySelectorAll('[role="dialog"], .dialog, .popup, .modal');
        for (let dialog of dialogs) {
            if (dialog.offsetParent !== null) { // Check if dialog is visible
                const buttons = dialog.querySelectorAll('button, [role="button"]');
                for (let button of buttons) {
                    if (button.textContent.toLowerCase().includes('yes') || 
                        button.textContent.toLowerCase().includes('continue')) {
                        console.log('[YouTube Music Auto-Continue] Found continue button in dialog:', button);
                        button.click();
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Function to check for the "Continue watching?" popup
    function checkForPopup() {
        if (!isEnabled) return;

        // Look for the popup text or dialog
        const popupTexts = [
            'Video paused. Continue watching?',
            'Continue watching?',
            'Are you still watching?',
            'Still there?'
        ];

        let popupFound = false;

        // Check if popup text exists in the page
        for (let text of popupTexts) {
            if (document.body.textContent.includes(text)) {
                popupFound = true;
                console.log('[YouTube Music Auto-Continue] Detected popup with text:', text);
                break;
            }
        }

        // Also check for visible dialogs/modals that might be the popup
        const dialogs = document.querySelectorAll('[role="dialog"], .dialog, .popup, .modal');
        for (let dialog of dialogs) {
            if (dialog.offsetParent !== null && 
                (dialog.textContent.toLowerCase().includes('continue') || 
                 dialog.textContent.toLowerCase().includes('watching') ||
                 dialog.textContent.toLowerCase().includes('paused'))) {
                popupFound = true;
                console.log('[YouTube Music Auto-Continue] Detected popup dialog:', dialog);
                break;
            }
        }

        if (popupFound) {
            // Wait a moment for the popup to fully render, then try to click
            setTimeout(() => {
                const clicked = clickContinueButton();
                if (clicked) {
                    console.log('[YouTube Music Auto-Continue] Successfully auto-continued playback');
                } else {
                    console.log('[YouTube Music Auto-Continue] Popup detected but could not find continue button');
                }
            }, 500);
        }
    }

    // Set up mutation observer to watch for DOM changes (popup appearing)
    function startObserver() {
        if (observer) return;

        observer = new MutationObserver(function(mutations) {
            // Check for popup after any DOM changes
            setTimeout(checkForPopup, 100);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }

    // Initialize the extension
    function init() {
        console.log('[YouTube Music Auto-Continue] Extension initialized');

        // Check for popup immediately
        checkForPopup();

        // Start observing for changes
        startObserver();

        // Also check periodically as backup
        setInterval(checkForPopup, 5000);

        // Listen for messages from popup/background
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (!request) return;

            if (request.action === 'toggle') {
                isEnabled = !isEnabled;
                // Persist the new value
                if (chrome && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({enabled: isEnabled});
                }
                console.log('[YouTube Music Auto-Continue] Toggled:', isEnabled ? 'enabled' : 'disabled');
                sendResponse({enabled: isEnabled});
            } else if (request.action === 'getStatus') {
                // Return the in-memory value; it's kept in sync with storage on init and toggle
                sendResponse({enabled: isEnabled});
            } else if (request.action === 'setEnabled') {
                // Explicitly set the enabled state (used by background when storage changes)
                isEnabled = !!request.enabled;
                console.log('[YouTube Music Auto-Continue] setEnabled received:', isEnabled);
                // Persist to storage to keep consistent
                if (chrome && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({enabled: isEnabled});
                }
                sendResponse({enabled: isEnabled});
            } else if (request.action === 'ping') {
                sendResponse({pong: true});
            }
        });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();