declare module 'vite-plugin-compression' {
  interface CompressionOptions {
    algorithm?: 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw';
    ext?: string;
    threshold?: number;
    deleteOriginFile?: boolean;
    filter?: (file: string) => boolean;
  }
  export default function compression(options?: CompressionOptions): any;
} 