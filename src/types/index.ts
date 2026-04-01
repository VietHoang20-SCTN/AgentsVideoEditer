export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ProjectWithCounts = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    mediaAssets: number;
  };
};
