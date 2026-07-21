"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import Image from "next/image";
import { Camera, Pencil, X, Save, Loader2, CheckCircle2 } from "lucide-react";

/* ───────── Avatar Upload ───────── */
interface AvatarUploadProps {
  currentUrl: string | null;
  initials: string;
}

export function AvatarUpload({ currentUrl, initials }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [dragging, setDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        setErrorMsg("Only JPEG, PNG, WebP, GIF allowed");
        setStatus("error");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg("Image must be under 2MB");
        setStatus("error");
        return;
      }

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload
      startTransition(async () => {
        try {
          const { uploadAvatar } = await import("@/app/actions/profile");
          const formData = new FormData();
          formData.set("avatar", file);
          const result = await uploadAvatar(formData);
          if (result.ok) {
            setStatus("success");
            if (result.value.avatarUrl) setPreview(result.value.avatarUrl);
            setTimeout(() => setStatus("idle"), 3000);
          } else {
            setErrorMsg(result.error.message || "Upload failed");
            setStatus("error");
          }
        } catch {
          setErrorMsg("Something went wrong");
          setStatus("error");
        }
      });
    },
    [startTransition]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="relative group">
      <div
        className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 shadow-xl shrink-0 transition-all duration-300 cursor-pointer
          ${dragging ? "border-primary-500 scale-105" : "border-white dark:border-gray-800"}
          ${status === "success" ? "border-green-500" : ""}
        `}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {preview ? (
          <Image
            src={preview}
            alt="Avatar"
            width={128}
            height={128}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full gradient-bg-primary text-white flex items-center justify-center text-3xl sm:text-4xl font-bold">
            {initials}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-2xl">
          {isPending ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Success checkmark */}
        {status === "success" && (
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg animate-scale-in">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Error message */}
      {status === "error" && (
        <p className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-red-500 font-medium">
          {errorMsg}
        </p>
      )}

      {/* Upload hint */}
      <p className="text-[10px] text-gray-400 text-center mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        Click or drop image
      </p>
    </div>
  );
}

/* ───────── Inline Edit Form ───────── */
const JLPT_LEVELS = [
  { value: "N5", label: "N5 — Beginner", desc: "Basic expressions, hiragana, katakana" },
  { value: "N4", label: "N4 — Elementary", desc: "Basic grammar, 300 kanji" },
  { value: "N3", label: "N3 — Intermediate", desc: "Everyday situations, 650 kanji" },
  { value: "N2", label: "N2 — Upper Intermediate", desc: "Newspaper level, 1000 kanji" },
  { value: "N1", label: "N1 — Advanced", desc: "Full fluency, 2000+ kanji" },
];

interface ProfileEditFormProps {
  displayName: string;
  jlptLevel: string;
}

export function ProfileEditForm({ displayName, jlptLevel }: ProfileEditFormProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [level, setLevel] = useState(jlptLevel);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    setSuccess(false);
    if (name.trim().length < 2) {
      setError("Display name must be at least 2 characters");
      return;
    }
    startTransition(async () => {
      try {
        const { updateProfile } = await import("@/app/actions/profile");
        const formData = new FormData();
        formData.set("display_name", name.trim());
        formData.set("current_jlpt_level", level);
        const result = await updateProfile(formData);
        if (result.ok) {
          setSuccess(true);
          setEditing(false);
          setTimeout(() => setSuccess(false), 3000);
        } else {
          setError(result.error.message || "Failed to update profile");
        }
      } catch {
        setError("Something went wrong");
      }
    });
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur border border-gray-200 dark:border-gray-600 text-sm font-medium hover:border-primary-400 dark:hover:border-primary-600 transition-all hover:shadow-md group"
      >
        <Pencil className="w-3.5 h-3.5 group-hover:text-primary-500 transition-colors" />
        Edit Profile
        {success && (
          <span className="text-green-500 text-xs font-semibold ml-1 animate-pulse">✓ Saved</span>
        )}
      </button>
    );
  }

  return (
    <div className="animate-scale-in p-5 rounded-2xl bg-white dark:bg-gray-800/80 backdrop-blur border border-primary-200 dark:border-primary-700 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm gradient-text">Edit Profile</h3>
        <button
          onClick={() => {
            setEditing(false);
            setName(displayName);
            setLevel(jlptLevel);
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Display Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          placeholder="Your display name"
          maxLength={50}
          autoFocus
        />
      </div>

      {/* JLPT Level */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Current JLPT Level
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {JLPT_LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLevel(l.value)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-left text-sm transition-all ${
                level === l.value
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  level === l.value
                    ? "gradient-bg-primary text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                }`}
              >
                {l.value}
              </span>
              <div>
                <p className="font-medium text-xs">{l.label}</p>
                <p className="text-[10px] text-gray-400">{l.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl gradient-bg-primary text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}
