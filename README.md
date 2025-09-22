# YouTube Music Auto-Continue Chrome Extension

## Installation Instructions

### Method 1: Load Unpacked Extension (Recommended)

1. **Download all extension files** to a folder on your computer:
   - manifest.json
   - content.js
   - popup.html
   - popup.js

2. **Open Chrome Extensions Page**:
   - Type `chrome://extensions/` in your address bar, or
   - Go to Chrome menu → More tools → Extensions

3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**:
   - Click "Load unpacked" button
   - Select the folder containing all the extension files
   - The extension should now appear in your extensions list

5. **Verify Installation**:
   - You should see "YouTube Music Auto-Continue" in your extensions
   - The extension icon should appear in your Chrome toolbar

### Usage

1. **Navigate to YouTube Music**:
   - Go to https://music.youtube.com
   - Start playing music as usual

2. **Extension Works Automatically**:
   - The extension runs in the background
   - When the "Continue watching?" popup appears, it automatically clicks "Yes"
   - No manual interaction needed!

3. **Toggle On/Off** (Optional):
   - Click the extension icon in your toolbar
   - Use the toggle switch to enable/disable the auto-continue feature

### How It Works

The extension:
- Monitors YouTube Music for the "Video paused. Continue watching?" popup
- Uses multiple detection methods to find the popup and "Yes" button
- Automatically clicks "Yes" within 500ms of popup detection
- Includes a backup check every 5 seconds
- Can be toggled on/off via the popup interface

### Troubleshooting

**Extension not working?**
- Make sure you're on music.youtube.com (not regular youtube.com)
- Check that the extension is enabled in chrome://extensions/
- Try refreshing the YouTube Music page
- Check browser console (F12) for any error messages

**Popup still appearing?**
- The extension may need a few seconds to detect new popup variations
- YouTube sometimes changes their popup structure - extension may need updates
- Try disabling and re-enabling the extension

### Technical Details

- **Permissions**: Only accesses music.youtube.com
- **Privacy**: No data collection, works entirely offline
- **Performance**: Lightweight, minimal CPU/memory usage
- **Compatibility**: Chrome 88+ (Manifest V3)

---
*Version 1.0 - Created for preventing YouTube Music auto-pause popups*
