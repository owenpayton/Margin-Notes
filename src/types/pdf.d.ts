// This augments the existing types from pdfjs-dist
declare module 'pdfjs-dist' {
  // Extend the global namespace
  namespace GlobalWorkerOptions {
    let workerSrc: string;
  }

  // Main entry point
  function getDocument(source: string | URL | TypedArray | PDFDataRangeTransport | DocumentInitParameters): PDFDocumentLoadingTask;

  interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
    onPassword: (callback: (password: string) => void) => void;
    cancel: () => void;
  }

  // Document initialization parameters
  interface DocumentInitParameters {
    url?: string;
    data?: TypedArray;
    httpHeaders?: Record<string, string>;
    withCredentials?: boolean;
    password?: string;
    cMapUrl?: string;
    cMapPacked?: boolean;
    length?: number;
    range?: PDFDataRangeTransport;
    disableAutoFetch?: boolean;
    disableStream?: boolean;
    disableRange?: boolean;
  }

  type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

  interface PDFDataRangeTransport {
    length: number;
    initialData: TypedArray;
    abort(): void;
    onDataRange(begin: number, chunk: TypedArray): void;
    onDataProgress(loaded: number, total: number): void;
    onDataProgressiveRead(chunk: TypedArray): void;
    progressiveDone(): void;
  }

  // Document proxy
  interface PDFDocumentProxy {
    numPages: number;
    fingerprint: string;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    getPageIndex(ref: object): Promise<number>;
    getDestination(id: string): Promise<Array<any>>;
    getDestinations(): Promise<Record<string, Array<any>>>;
    getOutline(): Promise<Array<PDFOutlineItem> | null>;
    getAttachments(): Promise<Record<string, PDFAttachment>>;
    getJavaScript(): Promise<Array<string>>;
    getMetadata(): Promise<{ info: Record<string, any>, metadata: any }>;
    getData(): Promise<TypedArray>;
    cleanup(): void;
    destroy(): Promise<void>;
  }

  // Page proxy
  interface PDFPageProxy {
    pageNumber: number;
    rotate: number;
    ref: object;
    getViewport(params: { scale: number, rotation?: number }): PDFViewport;
    render(params: PDFRenderParams): PDFRenderTask;
    getTextContent(params?: { normalizeWhitespace?: boolean }): Promise<TextContent>;
    getAnnotations(params?: { intent?: string }): Promise<Array<any>>;
    getOperatorList(): Promise<PDFOperatorList>;
    getJSActions(): Promise<Record<string, Array<string>> | null>;
    destroy(): Promise<void>;
  }

  interface PDFViewport {
    width: number;
    height: number;
    viewBox: Array<number>;
    scale: number;
    rotation: number;
    transform: Array<number>;
    clone(params: { scale?: number, rotation?: number }): PDFViewport;
    convertToViewportPoint(x: number, y: number): Array<number>;
    convertToViewportRectangle(rect: Array<number>): Array<number>;
    convertToPdfPoint(x: number, y: number): Array<number>;
  }

  interface PDFRenderParams {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
    intent?: string;
    enableWebGL?: boolean;
    renderInteractiveForms?: boolean;
    transform?: Array<number>;
  }

  interface PDFRenderTask {
    promise: Promise<void>;
    cancel(): void;
  }

  interface PDFOperatorList {
    fnArray: Array<number>;
    argsArray: Array<any>;
  }

  interface TextContent {
    items: Array<TextItem>;
    styles: Record<string, TextStyle>;
  }

  interface TextItem {
    str: string;
    dir: string;
    transform: Array<number>;
    width: number;
    height: number;
    fontName: string;
  }

  interface TextStyle {
    fontFamily: string;
    ascent: number;
    descent: number;
    vertical: boolean;
  }

  interface PDFOutlineItem {
    title: string;
    bold?: boolean;
    italic?: boolean;
    color?: Array<number>;
    dest?: string | Array<any>;
    url?: string;
    unsafeUrl?: string;
    newWindow?: boolean;
    count?: number;
    items?: Array<PDFOutlineItem>;
  }

  interface PDFAttachment {
    filename: string;
    content: TypedArray;
  }

  interface PDFRenderContext {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
  }
}
