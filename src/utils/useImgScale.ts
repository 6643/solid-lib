
let preferredMimeType: string | null = null;
const MIME_TYPE_FALLBACKS = ["image/avif", "image/webp", "image/png", "image/jpeg"];

const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("File read failed."));
        reader.readAsDataURL(file);
    });
};


const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image failed to load."));
        img.src = src;
    });
};


const canvasToBlob = (canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> => {
    return new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
};


type ImgScaleOptions = {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    mimeType?: "image/avif" | "image/webp" | "image/png" | "image/jpeg";
};


export const useImgScale = async (
    file: File,
    options: ImgScaleOptions = {}
): Promise<File> => {
    const {
        maxWidth = 720,
        maxHeight = 1080,
        quality = 0.8,
    } = options;

    // 1. 读取并加载图像
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);

    // 2. 计算缩放后尺寸并绘制到 Canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context.");

    let { width, height } = img;
    const ratio = width / height;

    if (width > maxWidth) {
        width = maxWidth;
        height = Math.round(width / ratio);
    }

    // 在宽度缩放后，再次检查高度是否超过限制
    if (height > maxHeight) {
        height = maxHeight;
        width = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    // 3. 确定要尝试的 MIME 类型列表
    const typesToTry = options.mimeType
        ? [options.mimeType]
        : preferredMimeType
            ? [preferredMimeType, ...MIME_TYPE_FALLBACKS.filter(t => t !== preferredMimeType)]
            : [...MIME_TYPE_FALLBACKS];

    // 4. 尝试将 Canvas 内容按顺序转换
    for (const currentMimeType of typesToTry) {
        const blob = await canvasToBlob(canvas, currentMimeType, quality);

        // 如果转换成功，则处理并返回
        if (blob) {
            preferredMimeType = currentMimeType; // 记住成功的类型

            const extension = currentMimeType.split("/")[1];
            const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            const newName = `${originalNameWithoutExt}.${extension}`;
            return new File([blob], newName, { type: currentMimeType, lastModified: Date.now() });
        }
    }

    // 如果所有尝试都失败了
    throw new Error("All image conversion attempts failed.");
};
