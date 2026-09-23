// src/utils/image.ts

/**
 * Convierte un File (imagen) a base64 redimensionado y comprimido.
 * Ideal para guardar en localStorage sin ocupar demasiado espacio.
 */
export function fileToAvatar(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo debe ser una imagen'))
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        // Redimensionar manteniendo proporción
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        // Exportar como JPEG comprimido
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}