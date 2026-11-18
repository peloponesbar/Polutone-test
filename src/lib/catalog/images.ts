/** Minimal shape of a product photo for color filtering (a populated Payload media doc). */
export type ColoredImage = { id: number; color?: string | null }

/**
 * Photos for the chosen color, keeping the admin's order. Photos without a color belong
 * to every color. Never falls back to another color's photos — that would show the wrong
 * garment; an empty result means "show a placeholder".
 */
export function imagesForColor<T extends ColoredImage>(images: T[], color: string | null): T[] {
  if (!color) return images
  return images.filter((image) => !image.color || image.color === color)
}
