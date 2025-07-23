# Add PDF Favicon Support

## What was implemented
Added custom favicon support for PDF pages in Chrome extension. Shows custom SVG icon in browser tab when viewing PDFs.

## Files modified

### 1. `web/viewer.html`
- Added favicon link: `<link rel="icon" type="image/svg+xml" href="../../icon.svg">`
- Path adjusted for Chrome extension structure with base tag

### 2. `extensions/chromium/contentscript.js`
- Added `setPageFavicon()` function to dynamically set favicon on main page
- Calls `chrome.runtime.getURL("icon.svg")` to get extension icon URL
- Called in `maybeRenderPdfDoc()`, `updateEmbedElement()`, `updateObjectElement()`

### 3. `extensions/chromium/manifest.json`
- Added `"icon.svg"` to `web_accessible_resources` array
- Required for Chrome extension to serve SVG file to web pages

### 4. `gulpfile.mjs`
- Added `gulp.src("icon.svg").pipe(gulp.dest(CHROME_BUILD_DIR))` to Chromium build task
- Ensures icon.svg is copied to build folder during build process

## Key requirements
- Icon file must be in project root as `icon.svg`
- Must be declared in manifest.json web_accessible_resources
- Must be copied during build process
- Content script handles dynamic favicon setting for main page
- Viewer.html handles favicon for iframe context

## Usage
Place `icon.svg` in project root, then run build. Favicon will appear when viewing PDFs.