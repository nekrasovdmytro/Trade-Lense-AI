<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# ChristNote AI Trade — Tri-Modal Neural Trading Suite

ChristNote AI Trade is a premium trading analysis suite comprising a **native macOS Application** and a companion **Google Chrome Extension**. It harmonizes visual, text, and voice analysis using state-of-the-art AI models (locally via Ollama or in the cloud via Nvidia NIM) to provide technical insights, pattern recognition, and precise data metrics.

---

## 🚀 Core Capabilities

The suite supports three main interaction channels to analyze your charts:

### 1. 📷 Computer Chart Vision
* **Region or Full Page Capture:** Select specific regions of a chart or capture the entire page instantly.
* **Visual Candlestick Analysis:** Analyzes candlestick patterns, support/resistance lines, Head & Shoulders, Golden Crosses, and trend breakouts.
* **Text Model Screen Context:** Automatically feeds recent visual screenshots as context when discussing charts with pure text models.

### 2. 🎤 Real-Time AI Audio Listening
* **Voice Transcription:** Transcribe speech on the fly to ask questions about the current screen context, record earnings call takeaways, or keep trading journals.
* **Auto-Silence Detection:** The recording engine automatically terminates and packages transcripts after a brief silence (2.5 seconds).
* **Multi-Language Speech:** Fully supports transcription in Ukrainian, English, and 17 other languages.

### 3. 🛡️ Tri-Modal Analytics System
* **Indicator Mode:** Returns strict `BUY`, `SELL`, or `SKIP` recommendations, complete with confidence levels (0% to 100%) and key technical signals.
* **Educator Mode:** Breaks down charts pedagogically to teach students patterns, market dynamics, and concepts.
* **Risk Advisor Mode:** Performs portfolio safety checks, suggesting entry ranges, target Stop Loss, Take Profit, and risk-reward ratios.
* **General Ask Mode:** Flexibly answers any questions regarding the screenshot or text query in plain, structured layout.

---

## 🔌 Chrome Extension Installation Guide

Since the companion extension is hosted directly in this repository, follow these steps to install it in Google Chrome:

### Step 1: Download & Unpack the Extension
1. Download [ChristNoteAITrade_ChromeExtension.zip](ChristNoteAITrade_ChromeExtension.zip) from this repository.
2. Unzip/extract the folder contents to a directory of your choice on your computer.

### Step 2: Load the Extension in Chrome
1. Launch Google Chrome and navigate to: `chrome://extensions/`
2. In the top-right corner of the Extensions page, switch the **Developer mode** toggle to **ON**.
3. In the top-left corner, click the **Load unpacked** button.
4. Select the unpacked `ChromeExtension` folder (the directory containing `manifest.json`).

### Step 3: Grant Microphone Permission
1. Click the extensions puzzle icon in the Chrome toolbar and pin **ChristNote AI Trade**.
2. Click the icon to open the Side Panel.
3. Click the **🎤 (microphone)** button in the ask bar.
4. Since sidepanels cannot prompt for media permissions directly, a setup page will open in a new tab (`permission.html`).
5. Click **Grant Permission** and choose **Allow** when prompted by Chrome.
6. Close the setup tab and return to the side panel; speech recognition is now ready!

---

## 💻 Running the Web landing Page Locally

To host the main ChristNote AI Trade landing page and dashboard:

### Prerequisites
* Node.js (v18+)

### Steps
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

---

## 🛠️ macOS App Installation
* Download the compiled app archive: [AnalyzeScreen_mac_silicon.zip](AnalyzeScreen_mac_silicon.zip).
* Unzip and drag `AnalyzeScreen.app` into your `/Applications` directory.
* **macOS "Unverified Developer" Gatekeeper Bypass**:
  Since the application is compiled natively and not signed with an Apple Developer account, macOS may display a malware warning. You can run it via one of these methods:
  * **Method 1**: Right-click (or Control-click) `AnalyzeScreen.app` in `/Applications`, select **Open**, and then click **Open Anyway** on the verification dialog.
  * **Method 2**: Go to **System Settings > Privacy & Security**, scroll down to the **Security** section, and click **Open Anyway** next to the blocked warning.
  * **Method 3**: Run the following command in Terminal to strip the quarantine attribute:
    ```bash
    xattr -cr /Applications/AnalyzeScreen.app
    ```
* When first launching, grant Speech Recognition and Microphone access when requested by the OS.
