import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Protected image route for Eva avatar
 * Serves the image with headers that discourage downloading
 */
export async function GET() {
  try {
    const imagePath = path.join(process.cwd(), 'public', 'eva-ag.png');
    const imageBuffer = await readFile(imagePath);
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Content-Disposition': 'inline', // Prevents download dialog
        'X-Content-Type-Options': 'nosniff',
        // Prevent caching in proxies
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return new NextResponse('Image not found', { status: 404 });
  }
}
