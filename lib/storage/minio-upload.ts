/**
 * Upload image to Minio storage
 * This is a client-side utility that uploads to a server endpoint
 */

export async function uploadImageToMinio(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload/image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Image upload failed:", error);
    throw error;
  }
}
