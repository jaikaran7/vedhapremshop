#!/usr/bin/env node
import sharp from 'sharp';
import { Buffer } from 'buffer';

/**
 * Generate PNG icons with text using Sharp (SVG to PNG conversion)
 */
async function generateIcon(width, height, text, maskable = false) {
  const fontSize = maskable ? width * 0.25 : width * 0.35;
  
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#1976d2"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">${text}</text>
</svg>`;
  
  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

// Generate icons
const icons = [
  { size: 192, name: 'icon-192.png', maskable: false },
  { size: 192, name: 'icon-192-maskable.png', maskable: true },
  { size: 512, name: 'icon-512.png', maskable: false },
  { size: 512, name: 'icon-512-maskable.png', maskable: true },
  { size: 180, name: 'apple-touch-icon.png', maskable: false },
];

console.log('Generating icon files...');

for (const { size, name, maskable } of icons) {
  try {
    const buffer = await generateIcon(size, size, 'VM', maskable);
    await sharp(buffer).toFile(`public/${name}`);
    console.log(`✓ Generated public/${name} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${name}:`, error.message);
  }
}

console.log('\n✓ All icons generated successfully!');
