# PDF Margin Notes

A feature-rich PDF viewer with margin note-taking capabilities and Anki integration

## Features

- **PDF Viewer** with table of contents/navigation outline support
- **Margin Note System** with:
  - Rich text editing capabilities
  - Multiple color-coded note types
  - Random subtle rotations for natural look
  - Per-page and global note organization
- **Anki Integration**:
  - Create cloze deletions directly in notes
  - Export selected notes as Anki-ready TSV files
  - Automatic card formatting with page references
- **Document Management**:
  - PDF file persistence (local storage)
  - Notes auto-save functionality
  - Import/export notes as JSON
  - Clear all data option
- **Advanced UI**:
  - Zoom controls (50-300%)
  - Page jump functionality
  - Two-pane view (PDF + notes)
  - Grain texture overlay for paper-like feel
  - Keyboard shortcuts (Alt+O for outline)
- **Note Organization**:
  - Automatic grouping by page
  - Full-text note previews
  - Creation timestamps
  - Sidebar note browser
- **Technical Features**:
  - PDF.js integration
  - Responsive design
  - Local storage persistence
  - TypeScript support
  - Tailwind CSS styling

## Installation

```bash
git clone [repo-url]
cd pdf-margin-notes
npm install
npm start
```

## Usage

1. Click "Open PDF" to load a PDF file
2. Click anywhere on the PDF to create a note
3. Use the right sidebar to:
   - View/edit current page notes
   - Access all notes
   - Export to Anki or JSON
4. Use the outline panel (Alt+O) for navigation
5. Double-click page number to jump to specific pages

## Keyboard Shortcuts

- Alt+O: Toggle table of contents
- Use ← → arrows for page navigation
- Double-click page number for quick jump

## Export Options

- **Anki Export**: Creates cloze deletion cards with page references
- **JSON Export**: Full note data including timestamps and positions
- Automatic PDF persistence (for files <10MB)

## Persistence

The app automatically saves:
- Last opened PDF (if under 10MB)
- All notes and annotations
- Current page and zoom level
- UI state (outline visibility, etc.)

## Built With

- React + TypeScript
- PDF.js
- Tailwind CSS
- LocalForage
- Anki-tsv format
