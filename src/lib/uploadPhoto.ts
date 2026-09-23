"use client";

import { upload } from "@vercel/blob/client";

function sanitizeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "foto.jpg";
}

export async function uploadPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("O arquivo selecionado não é uma imagem.");
  }

  const safeName = sanitizeFilename(file.name || "foto.jpg");
  const pathname = `registros/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  try {
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      contentType: file.type || undefined,
      multipart: file.size > 4 * 1024 * 1024,
    });

    if (!blob.url) {
      throw new Error("O armazenamento não devolveu a URL da foto.");
    }

    return blob.url;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida no upload.";
    throw new Error(`Não foi possível salvar a foto: ${message}`);
  }
}
