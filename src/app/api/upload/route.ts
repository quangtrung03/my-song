import { del, list, put } from "@vercel/blob";
import { NextResponse } from "next/server";

const VALID_SENDERS = ["You", "Friend"] as const;

type Sender = (typeof VALID_SENDERS)[number];

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function normalizeSender(value: FormDataEntryValue | null): Sender {
  if (typeof value !== "string") {
    return "You";
  }

  return VALID_SENDERS.includes(value as Sender) ? (value as Sender) : "You";
}

function getSongSender(pathname: string): Sender {
  const fullName = pathname.split("/").pop() ?? "";
  const parts = fullName.split("__");

  if (parts.length >= 3) {
    const decodedSender = decodeURIComponent(parts[1]);
    if (VALID_SENDERS.includes(decodedSender as Sender)) {
      return decodedSender as Sender;
    }
  }

  return "You";
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
    const sender = normalizeSender(formData.get("sender"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const normalizedName = file.name.trim();
    const encodedSender = encodeURIComponent(sender);
    const encodedName = encodeURIComponent(normalizedName);

    const uploaded = await put(
      `songs/${Date.now()}__${encodedSender}__${encodedName}`,
      file,
      {
        access: "public",
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    );

    return NextResponse.json(
      {
        song: {
          url: uploaded.url,
          pathname: uploaded.pathname,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          sender,
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
        sender: getSongSender(blob.pathname),
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