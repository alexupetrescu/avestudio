import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const IMAGE_PATTERN = /^.+-(\d{3})\.(jpe?g|png|webp)$/i;

async function getTours() {
  const baseDir = path.join(process.cwd(), 'public', '360s');

  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const tours: { slug: string; images: string[] }[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const folderPath = path.join(baseDir, entry.name);
      const files = await fs.readdir(folderPath);

      const images = files
        .filter((f) => IMAGE_PATTERN.test(f))
        .map((f) => {
          const match = f.match(IMAGE_PATTERN);
          return { file: f, num: match ? parseInt(match[1], 10) : 0 };
        })
        .sort((a, b) => a.num - b.num)
        .map(({ file }) => `/360s/${entry.name}/${file}`);

      if (images.length > 0) {
        tours.push({ slug: entry.name, images });
      }
    }

    return tours;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

export async function GET() {
  try {
    const tours = await getTours();
    return NextResponse.json({ tours });
  } catch (error) {
    console.error('360-tours API error:', error);
    return NextResponse.json(
      { error: 'Failed to load tours' },
      { status: 500 }
    );
  }
}
