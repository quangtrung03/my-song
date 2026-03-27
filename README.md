# Audio Upload App (Next.js + Vercel Blob)

Trang này cho phep upload toi da 5 file audio moi lan (MP3/M4A), sau do hien player de nghe lai.

## 1) Chay local

```bash
npm install
npm run dev
```

Mo `http://localhost:3000`.

## 2) Bien moi truong

Tao file `.env.local`:

```bash
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

Khuyen nghi:
- Tao Blob Store trong Vercel dashboard.
- Gan bien `BLOB_READ_WRITE_TOKEN` cho project (Production + Preview + Development).

## 3) Deploy len Vercel

1. Push code len GitHub.
2. Import repository vao Vercel.
3. Add env var `BLOB_READ_WRITE_TOKEN`.
4. Deploy.

Sau khi deploy, cac file audio duoc luu tren Vercel Blob nen khong bi mat khi server restart.

## Gioi han hien tai

- Toi da 5 file moi lan upload (client-side).
- Moi file toi da 10MB (server-side).
- Dinh dang hop le: `.mp3`, `.m4a`, `audio/mpeg`, `audio/mp4`, `audio/x-m4a`.
