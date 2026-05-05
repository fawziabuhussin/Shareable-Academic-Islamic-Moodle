import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { PRODUCTION_API_ORIGIN } from '@/lib/siteUrls';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 3 * 1024 * 1024;

function extFromMime(mime: string): string {
  if (/png/i.test(mime)) return 'png';
  if (/webp/i.test(mime)) return 'webp';
  if (/gif/i.test(mime)) return 'gif';
  return 'jpg';
}

/**
 * Server-side Vercel Blob upload for admin promotion images.
 * Token stays on the server (never use @vercel/blob `put` from the browser with a read-write token).
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.VERCEL ? PRODUCTION_API_ORIGIN : 'http://localhost:3001');
  const meRes = await fetch(`${apiBase.replace(/\/$/, '')}/api/auth/me`, {
    headers: { Authorization: auth },
  });
  if (!meRes.ok) {
    return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
  }
  const user = await meRes.json();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'غير مسموح' }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { message: 'Blob غير مُعدّ على مشروع الويب — أضف BLOB_READ_WRITE_TOKEN أو ارفع عبر الـ API' },
      { status: 501 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: 'طلب غير صالح' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: 'لم يُرفع ملف' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: 'الملف أكبر من 3 ميجابايت' }, { status: 400 });
  }
  const mime = file.type || 'application/octet-stream';
  if (!/^image\/(jpeg|jpg|pjpeg|png|webp|gif)$/i.test(mime)) {
    return NextResponse.json(
      { message: 'يُسمح بصور JPEG أو PNG أو WebP أو GIF فقط' },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.${extFromMime(mime)}`;

  try {
    const { put } = await import('@vercel/blob');
    const blob = await put(`promotions/${filename}`, buf, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mime,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'فشل الرفع';
    console.error('promotion-image blob:', e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
