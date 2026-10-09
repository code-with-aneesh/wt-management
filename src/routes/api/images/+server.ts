import { error, json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

const maxFileSize = 10 * 1024 * 1024;

async function getAuthenticatedUserId(request: Request) {
  const authorization = request.headers.get("authorization");
  const idToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!idToken || !env.VITE_API_KEY) {
    throw error(401, "You must be signed in to manage images.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.VITE_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );
  const data = await response.json().catch(() => null);
  const userId = data?.users?.[0]?.localId;

  if (!response.ok || typeof userId !== "string") {
    throw error(401, "Your sign-in session is invalid or expired.");
  }

  return userId;
}

export async function POST({ request }) {
  const userId = await getAuthenticatedUserId(request);
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw error(400, "An image file is required.");
  }
  if (!file.type.startsWith("image/")) {
    throw error(400, "Only image files are supported.");
  }
  if (file.size > maxFileSize) {
    throw error(413, "Images must be smaller than 10 MB.");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise<{
      public_id: string;
      secure_url: string;
      bytes: number;
      format: string;
    }>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: `wt-management/${userId}`,
          resource_type: "image",
          context: { userId }
        },
        (uploadError, uploadResult) => {
          if (uploadError || !uploadResult) {
            reject(uploadError ?? new Error("Cloudinary returned no upload result."));
          } else {
            resolve({
              public_id: uploadResult.public_id,
              secure_url: uploadResult.secure_url,
              bytes: uploadResult.bytes,
              format: uploadResult.format
            });
          }
        }
      );
      upload.end(buffer);
    });

    const thumbnailUrl = cloudinary.url(result.public_id, {
      secure: true,
      transformation: [
        { width: 640, height: 640, crop: "fill", gravity: "auto" },
        { quality: "auto:good", fetch_format: "auto", dpr: "auto" }
      ]
    });
    const imageUrl = cloudinary.url(result.public_id, {
      secure: true,
      transformation: [{ quality: "auto", fetch_format: "auto" }]
    });

    return json({
      publicId: result.public_id,
      imageUrl,
      thumbnailUrl,
      contentType: `image/${result.format}`,
      storedSize: result.bytes
    });
  } catch (uploadError) {
    console.error("Cloudinary upload failed:", uploadError);
    throw error(502, "Image upload failed.");
  }
}

export async function DELETE({ request }) {
  const userId = await getAuthenticatedUserId(request);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.publicId !== "string" || !body.publicId) {
    throw error(400, "A Cloudinary public ID is required.");
  }
  if (!body.publicId.startsWith(`wt-management/${userId}/`)) {
    throw error(403, "You cannot delete this image.");
  }

  try {
    await cloudinary.uploader.destroy(body.publicId, { resource_type: "image" });
    return json({ success: true });
  } catch (deleteError) {
    console.error("Cloudinary delete failed:", deleteError);
    throw error(502, "Image deletion failed.");
  }
}
