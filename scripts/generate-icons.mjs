import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'public', 'favicon.svg')
const outDir = join(root, 'public', 'icons')

mkdirSync(outDir, { recursive: true })

const svg = readFileSync(svgPath)

const icons = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  // maskable needs padding — 512x512 with ~10% safe zone
  { size: 512, name: 'icon-512x512-maskable.png', maskable: true },
]

for (const { size, name, maskable } of icons) {
  let pipeline = sharp(svg)

  if (maskable) {
    // For maskable icons, add padding so the icon sits in the safe zone
    const iconSize = Math.round(size * 0.6)
    const padding = Math.round((size - iconSize) / 2)
    const resizedIcon = await sharp(svg)
      .resize(iconSize, iconSize)
      .png()
      .toBuffer()

    pipeline = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 7, g: 14, b: 26, alpha: 1 } // #070e1a
      }
    }).composite([{ input: resizedIcon, gravity: 'center' }])
  } else {
    pipeline = sharp(svg).resize(size, size)
  }

  await pipeline.png().toFile(join(outDir, name))
  console.log(`  ${name} (${size}x${size})`)
}

console.log('Icons generated in public/icons/')
