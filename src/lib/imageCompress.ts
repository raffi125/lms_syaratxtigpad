/**
 * Kompresi berkas gambar di sisi browser menggunakan HTML5 Canvas
 * Mengubah gambar besar (misal 5MB) menjadi JPEG ringan (~100-200KB) dengan kualitas tinggi
 */
export async function compressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<File> {
  if (!file || !file.type.startsWith("image/")) {
    return file;
  }

  // Jika ukuran sudah di bawah 300KB dan berformat JPEG, tidak perlu kompresi ulang
  if (file.size < 300 * 1024 && file.type === "image/jpeg") {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Gambar latar belakang putih jika PNG transparan
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanFileName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanFileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
