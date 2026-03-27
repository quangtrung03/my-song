import { del, list, put } from "@vercel/blob";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isValidMp3(file: File) {
  const lowerName = file.name.toLowerCase();

  return (
    file.type === "audio/mpeg" ||
    file.type === "audio/mp4" ||
    file.type === "audio/x-m4a" ||
    lowerName.endsWith(".mp3") ||
    lowerName.endsWith(".m4a")
  );
}

export async function POST(request: Request) {
  if (!hasBlobToken()) {
    return NextResponse.json(
      {
        error:
          "Missing BLOB_READ_WRITE_TOKEN. Add it in Vercel project environment variables.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (!isValidMp3(file)) {
      return NextResponse.json(
        { error: "Only MP3 and M4A files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10 MB per file." },
        { status: 400 }
      );
    }

    const normalizedName = file.name.trim();
    const encodedName = encodeURIComponent(normalizedName);

    const uploaded = await put(`songs/${Date.now()}__${encodedName}`, file, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json(
      {
        song: {
          url: uploaded.url,
          pathname: uploaded.pathname,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

export async function GET() {
  if (!hasBlobToken()) {
    return NextResponse.json(
      {
        error:
          "Missing BLOB_READ_WRITE_TOKEN. Add it in Vercel project environment variables.",
      },
      { status: 500 }
    );
  }

  try {
    const { blobs } = await list({
      prefix: "songs/",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      limit: 100,
    });

    const songs = blobs
      .sort(
        (first, second) =>
          new Date(second.uploadedAt).getTime() -
          new Date(first.uploadedAt).getTime()
      )
      .map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      }));

    return NextResponse.json({ songs });
  } catch {
    return NextResponse.json({ error: "Could not load songs." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!hasBlobToken()) {
    return NextResponse.json(
      {
        error:
          "Missing BLOB_READ_WRITE_TOKEN. Add it in Vercel project environment variables.",
      },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url) {
      return NextResponse.json({ error: "Song url is required." }, { status: 400 });
    }

    await del(body.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete song." }, { status: 500 });
  }
}