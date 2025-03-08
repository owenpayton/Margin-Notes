export interface Note {
  id: string;
  pageNumber: number;
  yPosition: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  color: string;
  rotation: string;
  isEditing: boolean;
  hasCloze?: boolean;
}

export interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  getOutline: () => Promise<PDFOutlineItem[] | null>;
  getDestination?: (dest: string) => Promise<any[] | null>;
}

export interface PDFOutlineItem {
  title: string;
  bold?: boolean;
  italic?: boolean;
  color?: number[];
  dest?: string | any[];
  url?: string;
  unsafeUrl?: string;
  newWindow?: boolean;
  count?: number;
  items?: PDFOutlineItem[];
}

export interface PDFPageProxy {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (renderContext: PDFRenderContext) => { promise: Promise<void> };
}

export interface PDFViewport {
  height: number;
  width: number;
}

export interface PDFRenderContext {
  canvasContext: CanvasRenderingContext2D;
  viewport: PDFViewport;
}

export const NOTE_COLORS = ['bg-amber-100 border-amber-300', 'bg-rose-100 border-rose-300', 'bg-orange-100 border-orange-300', 'bg-stone-100 border-stone-300', 'bg-yellow-100 border-yellow-300'];
export const NOTE_ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-0.5', 'rotate-0.5', 'rotate-0'];
