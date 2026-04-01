import fs from "fs/promises";
import path from "path";
import type { StorageProvider } from "./index";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export class LocalStorage implements StorageProvider {
  async save(key: string, data: Buffer): Promise<void> {
    const filePath = this.getPath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async saveStream(key: string, stream: ReadableStream, size?: number): Promise<void> {
    const { Readable } = await import("stream");
    const { pipeline } = await import("stream/promises");
    const filePath = this.getPath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const writeStream = (await import("fs")).createWriteStream(filePath);
    const nodeStream = Readable.fromWeb(stream as any);
    await pipeline(nodeStream, writeStream);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.getPath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.getPath(key));
    } catch (err) {
      // Ignore "file not found" — idempotent delete
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getPath(key));
      return true;
    } catch {
      return false;
    }
  }

  getPath(key: string): string {
    return path.resolve(UPLOAD_DIR, key);
  }
}

export const storage = new LocalStorage();
