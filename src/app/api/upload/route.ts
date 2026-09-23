import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";

import { getObraUser } from "@/app/api/_helpers/obra-auth";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
];

export async function POST(req: NextRequest) {
  let body: HandleUploadBody;

  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      { error: "Solicitação de upload inválida." },
      { status: 400 }
    );
  }

  try {
    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const user = await getObraUser(req);

        if (!user) {
          throw new Error("Sessão expirada. Entre novamente antes de enviar fotos.");
        }

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          throw new Error(
            "O armazenamento de fotos não está configurado no ambiente da Vercel."
          );
        }

        return {
          allowedContentTypes: ALLOWED_IMAGE_TYPES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.info("Foto do diário salva no Vercel Blob:", blob.pathname);
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao preparar o upload da foto.";

    console.error("Vercel Blob client upload failed:", error);

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
