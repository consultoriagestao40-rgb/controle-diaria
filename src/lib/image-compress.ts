export function compressImageIfNeeded(file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
        // Safe check for SSR environment
        if (typeof window === "undefined") {
            resolve(file)
            return
        }

        // Only attempt to compress images
        if (!file.type.startsWith("image/")) {
            resolve(file)
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                let width = img.width
                let height = img.height

                // Scale down if dimensions are larger than limits
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)
                }

                const canvas = document.createElement("canvas")
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    resolve(file)
                    return
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height)

                // Use image/jpeg for compression since it's most efficient for photos/receipts
                // Keep PNG only if original was PNG, otherwise default to JPEG
                const outputType = file.type === "image/png" || file.type === "image/jpeg" ? file.type : "image/jpeg"

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressed = new File([blob], file.name, {
                                type: outputType,
                                lastModified: Date.now()
                            })
                            // Only return the compressed file if it's actually smaller than the original
                            if (compressed.size < file.size) {
                                resolve(compressed)
                            } else {
                                resolve(file)
                            }
                        } else {
                            resolve(file)
                        }
                    },
                    outputType,
                    quality
                )
            }
            img.onerror = () => resolve(file)
            img.src = e.target?.result as string
        }
        reader.onerror = () => resolve(file)
        reader.readAsDataURL(file)
    })
}
