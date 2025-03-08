import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set the worker source
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${process.env.REACT_APP_PDFJS_VERSION || '3.11.174'}/pdf.worker.min.js`;

export default GlobalWorkerOptions;
