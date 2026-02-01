# LRC Video Subtitle Synchronizer

A browser-based video subtitle synchronization tool that allows you to assign subtitles to videos and export them as standard LRC subtitle files.

## 🎯 Core Features

- **Video Segmentation**: Cut videos into segments at any time point
- **Subtitle Assignment**: Drag-and-drop subtitles to corresponding time segments
- **Timeline Visualization**: Intuitive timeline interface with hover-to-view full subtitles
- **LRC Export**: Generate standard LRC subtitle files
- **Batch Import**: Support bulk pasting of subtitle text with automatic sentence splitting

## 🚀 Quick Start

### Development Mode
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Chrome Extension Mode
1. Run `npm run build` to build the project
2. Open Chrome Extensions page (chrome://extensions/)
3. Enable "Developer mode"
4. Click "Load unpacked extension" and select the `dist` directory
5. Or choose "Pack extension" to create a CRX file from the `dist` directory
6. Start using the extension

### Usage Workflow
1. Import video file
2. Play video and segment as needed
3. Prepare subtitle text (single or batch)
4. Drag subtitles to corresponding time segments
5. Export LRC file

## 🛠 Tech Stack

- React + TypeScript
- Tailwind CSS
- Vite build tool
- Pure frontend implementation, no backend server required

## 📦 Project Features

- **Client-side Only**: All processing happens in the browser, no video upload needed
- **Drag-and-Drop Interaction**: Intuitive drag-and-drop subtitle assignment
- **Keyboard Shortcuts**: Space to play/pause, M key to cut segments

## 🔧 Environment Requirements

- Node.js 16+
- Modern browsers (Chrome 90+ / Firefox 88+ / Safari 14+)