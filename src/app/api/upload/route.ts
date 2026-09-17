import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface PlatformUploadResponse {
  url?: string;
  publicUrl?: string;
  mimeType?: string | null;
  externalId?: string | null;
}

/**
 * POST /api/upload
 *
 * The original worker put the file straight into the `R2_BUCKET` binding and
 * returned the object key. On Anything there is no direct object-storage
 * access, so this route forwards the multipart body to the same-origin internal
 * upload endpoint and returns the resulting public URL.
 *
 * `key` is kept in the response body (now holding the public URL) because the
 * existing callers — DiaryForm/EditRegistroModal `uploadFile()` — read
 * `data.key` and persist it into `registros.foto_*_key`.
 */
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const forwarded = new FormData();
  forwarded.append("file", file, file.name || "upload");

  const uploadRes = await fetch(new URL("/_create/api/upload", req.url), {
    method: "POST",
    body: forwarded,
  });

  if (!uploadRes.ok) {
    const detail = await uploadRes.text().catch(() => "");
    console.error("Upload failed:", uploadRes.status, detail);
    return NextResponse.json(
      { error: "Falha ao enviar arquivo" },
      { status: uploadRes.status === 413 ? 413 : 502 }
    );
  }

  const data = (await uploadRes
    .json()
    .catch(() => null)) as PlatformUploadResponse | null;

  const url = data?.url ?? data?.publicUrl ?? null;
  if (!url) {
    console.error("Upload endpoint returned no url", data);
    return NextResponse.json({ error: "Falha ao enviar arquivo" }, { status: 502 });
  }

  return NextResponse.json({
    key: url,
    url,
    mimeType: data?.mimeType ?? (file.type || null),
    filename: file.name || null,
    externalId: data?.externalId ?? null,
  });
}
