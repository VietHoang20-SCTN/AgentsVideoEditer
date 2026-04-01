import { env } from "@/lib/env";
import { LocalStorage } from "./local";
import type { StorageProvider } from "./index";

function createStorage(): StorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case "local":
      return new LocalStorage();
    case "s3":
      throw new Error("S3 storage not yet implemented. Set STORAGE_PROVIDER=local.");
    default:
      return new LocalStorage();
  }
}

export const storage = createStorage();
export type { StorageProvider };
