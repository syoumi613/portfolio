import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error('Firebase Fetch Failed');
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Proxy side error' }, { status: 500 });
    }
}
