"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { User, HardDrive, Key, Save, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

interface StorageInfo {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
}

interface AISettings {
  aiApiKey: string | null;
  aiBaseUrl: string | null;
  hasApiKey: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function SettingsPage() {
  const { data: session } = useSession();

  // Storage state
  const [storage, setStorage] = useState<StorageInfo | null>(null);

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/user/storage")
      .then((r) => r.json())
      .then((d) => { if (d.success) setStorage(d.data); })
      .catch(() => {});

    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAiSettings(d.data);
          setBaseUrlInput(d.data.aiBaseUrl ?? "");
        }
      })
      .catch(() => {});
  }, []);

  async function handleSaveAI(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("idle");
    setSaveError("");

    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Only send aiApiKey if user typed something — empty means "keep existing"
          ...(apiKeyInput ? { aiApiKey: apiKeyInput } : {}),
          aiBaseUrl: baseUrlInput || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSettings(data.data);
        setApiKeyInput(""); // clear after save for security
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        setSaveError(data.error || "Failed to save settings");
      }
    } catch {
      setSaveStatus("error");
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your account and preferences.</p>

      <div className="mt-6 space-y-6">
        {/* Profile Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Profile</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{session?.user?.name ?? "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{session?.user?.email ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Storage Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Storage</h2>
          </div>
          {storage ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{formatBytes(storage.usedBytes)} used</span>
                <span className="text-gray-400">{formatBytes(storage.quotaBytes)} total</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    storage.percentUsed > 80 ? "bg-red-500" : storage.percentUsed > 50 ? "bg-yellow-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(storage.percentUsed, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{storage.percentUsed}% used</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading storage info…</p>
          )}
        </div>

        {/* AI / API Configuration Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-1">
            <Key className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">AI Provider Configuration</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Configure your AI API key (OpenAI, 9router, or any OpenAI-compatible provider).
            User settings take priority over server environment variables.
          </p>

          {aiSettings?.hasApiKey && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>API key configured (ending in <code className="font-mono">{aiSettings.aiApiKey}</code>)</span>
            </div>
          )}

          <form onSubmit={handleSaveAI} className="space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={aiSettings?.hasApiKey ? "Enter new key to replace existing…" : "sk-... or your 9router key"}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">Leave blank to keep existing key unchanged.</p>
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={baseUrlInput}
                onChange={(e) => setBaseUrlInput(e.target.value)}
                placeholder="https://api.9router.ai/v1"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                For OpenAI-compatible proxies (9router, Azure, etc.). Leave blank for direct OpenAI.
              </p>
            </div>

            {/* Save button + status */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save AI Settings"}
              </button>

              {saveStatus === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" /> Saved successfully
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" /> {saveError}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
