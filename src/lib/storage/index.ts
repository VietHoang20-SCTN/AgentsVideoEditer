export interface StorageProvider {
  save(key: string, data: Buffer): Promise<void>;
  saveStream(key: string, stream: ReadableStream, size?: number): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getPath(key: string): string;
  getSignedUrl?(key: string, expiresIn: number): Promise<string>;
}
