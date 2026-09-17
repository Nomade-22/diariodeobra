import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function sanitizeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "foto";
}

/**
 * POST /api/upload
 *
 * Salva as fotos do Diário de Obra no Vercel Blob e devolve a URL pública.
 * O frontend continua recebendo `key`, preservando o contrato da aplicação
 * original, mas agora o valor salvo em registros.foto_*_key é uma URL pública.
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

  if (file.size === 0) {
    return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
  }

  try {
    const safeName = sanitizeFilename(file.name || "foto");
    const pathname = `registros/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type || undefined,
    });

    return NextResponse.json({
      key: blob.url,
      url: blob.url,
      mimeType: blob.contentType ?? file.type ?? null,
      filename: file.name || null,
      externalId: blob.pathname,
    });
  } catch (error) {
    console.error("Vercel Blob upload failed:", error);
    return NextResponse.json(
      { error: "Falha ao enviar arquivo" },
      { status: 500 }
    );
  }
}
