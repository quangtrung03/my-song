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

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [songs, setSongs] = useState<UploadedSong[]>([]);
  const [loading, setLoading] = useState(false);
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
      setNotice("Upload successful.");
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

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 py-12 sm:px-8">
      <div className="noise pointer-events-none absolute inset-0" />

      <section className="relative z-10 w-full max-w-4xl rounded-3xl border border-white/45 bg-white/85 p-6 shadow-[0_30px_90px_-45px_rgba(18,32,60,0.45)] backdrop-blur sm:p-10">
        <header className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-sky-900/75">
            Next.js + Vercel Blob
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Upload short MP3 files and host them on Vercel
          </h1>
          <p className="max-w-2xl text-sm text-slate-700 sm:text-base">
            You can pick up to 5 files each upload. Every uploaded song will show
            up below with an audio player.
          </p>
        </header>

        <form onSubmit={onUpload} className="mt-8 grid gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
          <label className="text-sm leading-6 text-slate-200">
            Choose MP3 or M4A files (max 5)
            <input
              type="file"
              accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
              multiple
              onChange={onChooseFiles}
              className="mt-2 block w-full cursor-pointer rounded-xl border border-white/20 bg-white/10 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-amber-300 file:px-3 file:py-2 file:font-semibold file:text-slate-950"
            />
          </label>

          {selectedFiles.length > 0 && (
            <ul className="grid gap-2 text-sm text-slate-200">
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
            className="mt-1 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Uploading..." : "Upload audio files"}
          </button>

          {notice && <p className="text-sm text-emerald-300">{notice}</p>}
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </form>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Uploaded songs</h2>
          <div className="mt-3 grid gap-3">
            {songs.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-sm text-slate-600">
                No uploaded songs yet.
              </p>
            )}

            {songs.map((song) => (
              <article
                key={song.url}
                className="rounded-xl border border-slate-200 bg-white/80 p-4"
              >
                <p className="truncate text-sm font-semibold text-slate-900">
                  {song.pathname.split("/").pop()}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {new Date(song.uploadedAt).toLocaleString()} - {bytesToMb(song.size)} MB
                </p>
                <audio controls className="mt-3 w-full" preload="none">
                  <source src={song.url} type={getAudioMimeType(song.pathname)} />
                  Your browser does not support audio playback.
                </audio>
                <a
                  href={song.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-sky-700 hover:text-sky-900"
                >
                  Open file URL
                </a>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
