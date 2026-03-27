"use client";

import { useEffect, useState } from "react";

type UploadedSong = {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
};

const MAX_SONGS = 5;

function bytesToMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function getAudioMimeType(pathname: string) {
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".m4a")) {
    return "audio/mp4";
  }

  return "audio/mpeg";
}

function toDisplayTitle(pathname: string) {
  const fullName = pathname.split("/").pop() ?? "Unknown track";

  // New format: <timestamp>__<encoded-original-name>
  const encodedOriginalName = fullName.split("__")[1];
  if (encodedOriginalName) {
    try {
      return decodeURIComponent(encodedOriginalName);
    } catch {
      return encodedOriginalName;
    }
  }

  // Legacy format fallback: remove timestamp/random suffix and normalize dashes.
  const legacyWithoutPrefix = fullName.replace(/^\d+-/, "");
  const dotIndex = legacyWithoutPrefix.lastIndexOf(".");

  if (dotIndex <= 0) {
    return legacyWithoutPrefix.replace(/-/g, " ");
  }

  const base = legacyWithoutPrefix.slice(0, dotIndex);
  const ext = legacyWithoutPrefix.slice(dotIndex);
  const cleanedBase = base.replace(/-[A-Za-z0-9]{12,}$/, "");

  return `${cleanedBase.replace(/-/g, " ")}${ext}`;
}

function toFriendlyTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [songs, setSongs] = useState<UploadedSong[]>([]);
  const [activeSongUrl, setActiveSongUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    void loadSongs();
  }, []);

  async function loadSongs() {
    setError("");
    try {
      const response = await fetch("/api/upload", { method: "GET" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Could not load song list.");
      }

      const body = (await response.json()) as { songs: UploadedSong[] };
      setSongs(body.songs);
      setActiveSongUrl((previous) => {
        if (body.songs.length === 0) {
          return "";
        }

        if (previous && body.songs.some((song) => song.url === previous)) {
          return previous;
        }

        return body.songs[0].url;
      });
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Could not load song list.";
      setError(message);
    }
  }

  function onChooseFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setNotice("");
    setError("");

    if (files.length === 0) {
      setSelectedFiles([]);
      return;
    }

    if (files.length > MAX_SONGS) {
      setNotice(`Only the first ${MAX_SONGS} files will be uploaded.`);
      setSelectedFiles(files.slice(0, MAX_SONGS));
      return;
    }

    setSelectedFiles(files);
  }

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setError("Please choose at least one MP3 or M4A file.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? `Upload failed for ${file.name}`);
        }
      }

      setSelectedFiles([]);
      setNotice("Your songs are shared. Your friend can play them now.");
      await loadSongs();
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteSong(song: UploadedSong) {
    setDeletingUrl(song.url);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: song.url }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Delete failed.");
      }

      setNotice("Song deleted.");
      await loadSongs();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Delete failed.";
      setError(message);
    } finally {
      setDeletingUrl("");
    }
  }

  const activeSong = songs.find((song) => song.url === activeSongUrl) ?? songs[0];

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 py-10 sm:px-8 sm:py-14">
      <div className="noise pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-[-80px] top-10 h-48 w-48 rounded-full bg-rose-200/70 blur-3xl sm:h-80 sm:w-80" />
      <div className="pointer-events-none absolute bottom-0 right-[-40px] h-52 w-52 rounded-full bg-cyan-200/70 blur-3xl sm:h-80 sm:w-80" />

      <section className="fade-in relative z-10 w-full max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_36px_90px_-44px_rgba(49,65,112,0.55)] backdrop-blur-xl sm:p-8">
        <header className="space-y-3 px-1">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-rose-700/80">
            Soft music room
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-[3.1rem]">
            Relax and listen together
          </h1>
          <p className="max-w-2xl text-sm text-slate-700 sm:text-base">
            A tiny place for you and your friend. Upload songs, pick from the list,
            and play calm audio anytime.
          </p>
        </header>

        <section className="stagger-1 mt-8 rounded-3xl border border-white/80 bg-gradient-to-br from-rose-50 to-cyan-50 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Now playing
            </p>
            <h2 className="mt-2 truncate text-2xl font-semibold text-slate-900">
              {activeSong ? toDisplayTitle(activeSong.pathname) : "No song yet"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {activeSong
                ? `Shared on ${toFriendlyTime(activeSong.uploadedAt)}`
                : "Upload a song to start your music room."}
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-[170px_1fr] md:items-center">
              <div className="flex justify-center md:justify-start">
                <div className={`vinyl-disc ${activeSong ? "is-spinning" : ""}`}>
                  <div className="vinyl-ring" />
                  <div className="vinyl-ring vinyl-ring-2" />
                  <div className="vinyl-core">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-7 w-7 text-white/95"
                      fill="currentColor"
                    >
                      <path d="M18 3a1 1 0 0 0-1 1v8.1a4 4 0 1 0 2 3.4V7.3l2.6-.65a1 1 0 0 0-.48-1.94L18 5.5V4a1 1 0 0 0-1-1ZM9 15a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white/80 p-4">
                {activeSong ? (
                  <audio
                    key={activeSong.url}
                    controls
                    autoPlay
                    className="w-full"
                    preload="metadata"
                  >
                    <source
                      src={activeSong.url}
                      type={getAudioMimeType(activeSong.pathname)}
                    />
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <p className="text-sm text-slate-500">Please upload a song first.</p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <p className="rounded-xl bg-white/70 px-3 py-2">
                Format: MP3 and M4A
              </p>
              <p className="rounded-xl bg-white/70 px-3 py-2">Max 10 MB for each file</p>
            </div>
        </section>

        <section className="stagger-2 mt-6 rounded-3xl border border-white/70 bg-white/75 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Playlist</h3>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
              {songs.length} tracks
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {songs.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white/75 px-4 py-6 text-sm text-slate-600">
                No songs yet. Upload your first calm track.
              </p>
            )}

            {songs.map((song, index) => {
              const isActive = activeSong?.url === song.url;

              return (
                <article
                  key={song.url}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-rose-300 bg-rose-50"
                      : "border-slate-200 bg-white/90 hover:border-cyan-200 hover:bg-cyan-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveSongUrl(song.url)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {index + 1}. {toDisplayTitle(song.pathname)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {toFriendlyTime(song.uploadedAt)} - {bytesToMb(song.size)} MB
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => void onDeleteSong(song)}
                      disabled={deletingUrl === song.url}
                      className="shrink-0 rounded-lg border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deletingUrl === song.url ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <form
          onSubmit={onUpload}
          className="stagger-3 mt-6 grid gap-4 rounded-3xl bg-slate-900 p-5 text-white shadow-[0_24px_60px_-35px_rgba(15,23,42,1)] sm:p-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-rose-200">Share with friend</p>
            <h3 className="mt-2 text-xl font-semibold">Upload new audio</h3>
          </div>

          <label className="text-sm leading-6 text-slate-200">
            Choose MP3 or M4A files (max 5)
            <input
              type="file"
              accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
              multiple
              onChange={onChooseFiles}
              className="mt-2 block w-full cursor-pointer rounded-xl border border-white/20 bg-white/10 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-rose-200 file:px-3 file:py-2 file:font-semibold file:text-slate-900"
            />
          </label>

          {selectedFiles.length > 0 && (
            <ul className="grid max-h-40 gap-2 overflow-auto text-sm text-slate-200">
              {selectedFiles.map((file) => (
                <li key={file.name} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
                  {file.name} ({bytesToMb(file.size)} MB)
                </li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-rose-200 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
          >
            {loading ? "Uploading..." : "Send songs"}
          </button>

          {notice && <p className="text-sm text-emerald-300">{notice}</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </form>
      </section>
    </main>
  );
}
