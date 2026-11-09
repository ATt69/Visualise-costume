# Tailor Studio – 3D Parametric Costume Preview (v3)

A 16:9 **1920×1080** landscape application for tailors and their customers to preview finished costumes in **interactive 3D** with real-time measurement adjustments, camera/photo fabric textures, interactive material cropping, dual-piece fabrics, and custom accessories.

## Key Features
1. **Interactive 3D Mannequin & Costumes (`model3d.js` + `lib/three.min.js`):**
   - **6 Parametric 3D Costumes:** `Shirt`, `Pants`, `Shirt + Pants` (`combo`), `Suit` (tailored jacket, inner shirt, tie for male, trousers), `Dress` (fitted bodice + pleated flared skirt), and `Áo dài` (standing Mandarin collar, diagonal clasp buttons, flowing front/back `tà áo` panels, and wide-leg silk trousers).
   - **Female & Male 3D Models:** Switch between `Female` (`♀`) and `Male` (`♂`) mannequins with anatomical 3D contours, gender-specific 3D hairstyles, and default body measurements.
   - **360° Interactive Orbit & Cardinal Views:** Click `Front`, `Right side`, `Back`, `Left side`, or `Change view` for smooth animated 3D rotation, click `360°` for hands-free turntable rotation, or drag directly on the 3D stage to inspect any angle.
2. **Real-Time Parametric Measurements (`cm`):**
   - Adjust customer body measurements (`Customer height`, `Shoulder width`, `Bust / chest`, `Waist`, `Hip`) and costume measurements (`Length`, `Sleeve length`, `Trouser length`, `Trouser hem`, `Skirt hem sweep`, `Ease`) with instant 3D mesh updates and live dimension callouts.
3. **Photo / Camera Fabric Material & Crop Tool:**
   - Capture fabric via live camera (`Take photo`) or local photo (`Choose photo`), crop/rotate with aspect-ratio presets (`Free`, `1:1`, `4:3`, `3:4`), and map directly onto the 3D costume with real-time pattern scale, rotation, and seamless mirror tiling.
   - Supports independent or linked fabrics for two-piece outfits (`Shirt + Pants` and `Suit`).
4. **Accessories Studio Tab:**
   - Freehand drawing canvas (`Pen`, `Eraser`, `Fill`, 15-color palette + custom color picker, brush size, symmetric mirror drawing, undo/clear) plus 10 ready-made accessories that can be placed, dragged, resized, rotated, flipped, and exported with `Save image`.

---

## Porting Tailor Studio to Android

The project includes [`manifest.json`](manifest.json), [`capacitor.config.json`](capacitor.config.json), and [`package.json`](package.json) pre-configured for Android deployment. You can choose from three approaches depending on your distribution needs:

### Option 1: Capacitor Native Android APK / AAB (Recommended)
Packages the app into a native Android project for Android Studio or Google Play Store distribution with full hardware WebGL 3D, camera, and gallery support.

1. **Install Capacitor packages:**
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```
2. **Create and sync the Android project:**
   ```bash
   npm run android:init
   ```
3. **Configure Landscape Orientation & Camera Permissions** in `android/app/src/main/AndroidManifest.xml`:
   - On `<activity android:name=".MainActivity" ...>`, set:
     ```xml
     android:screenOrientation="sensorLandscape"
     ```
   - Inside `<manifest ...>`, ensure camera permission is declared:
     ```xml
     <uses-permission android:name="android.permission.CAMERA" />
     ```
4. **Build or Run in Android Studio:**
   ```bash
   npm run android:open
   ```
   In Android Studio, select **Build → Build Bundle(s) / APK(s) → Build APK(s)** to generate the installable `.apk`.

### Option 2: Installable Fullscreen Landscape PWA (Zero Build Tools)
1. Host the `tailor-studio` folder over HTTPS (e.g., GitHub Pages, Netlify, Cloudflare Pages, or a local LAN server).
2. Open the URL in **Chrome on an Android tablet or phone**.
3. Tap **Menu (⋮) → Add to Home screen / Install app**.
4. Because [`manifest.json`](manifest.json) specifies `"display": "fullscreen"` and `"orientation": "landscape"`, Android launches Tailor Studio in fullscreen 16:9 landscape mode like a native app.

### Option 3: Custom Android Studio `WebView` Wrapper
1. Create a new **Empty Views Activity** project in Android Studio.
2. Copy `index.html`, `style.css`, `garments.js`, `model3d.js`, `app.js`, `manifest.json`, and `lib/three.min.js` into `app/src/main/assets/`.
3. Lock `MainActivity` to `android:screenOrientation="sensorLandscape"` in `AndroidManifest.xml`.
4. Enable `webView.settings.javaScriptEnabled = true`, `webView.settings.domStorageEnabled = true`, and implement `WebChromeClient.onPermissionRequest` (for WebRTC camera) and `WebChromeClient.onShowFileChooser` (for fabric photo selection), then call `webView.loadUrl("file:///android_asset/index.html")`.
