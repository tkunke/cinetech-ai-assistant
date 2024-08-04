import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const tag = request.nextUrl.searchParams.get('tag');

  if (!userId || !tag) {
    console.error("User ID and tag are required");
    return NextResponse.json({ error: 'User ID and tag are required' }, { status: 400 });
  }

  try {
    console.log(`Fetching objects for user: ${userId} with tag: ${tag}`);

    // Fetch images associated with the tag
    const imagesQuery = await sql`
      SELECT img.image_url, img.thumbnail_url
      FROM user_gen_images img
      INNER JOIN project_tag_images pti ON img.id = pti.image_id
      INNER JOIN project_tags pt ON pti.tag_id = pt.id
      WHERE pt.name = ${tag} AND img.user_id = ${userId}
    `;
    
    // Fetch messages associated with the tag
    const messagesQuery = await sql`
      SELECT msg.message_url
      FROM user_gen_messages msg
      INNER JOIN project_tag_messages ptm ON msg.id = ptm.message_id
      INNER JOIN project_tags pt ON ptm.tag_id = pt.id
      WHERE pt.name = ${tag} AND msg.user_id = ${userId}
    `;

    // Fetch generated files associated with the tag
    const generatedFilesQuery = await sql`
      SELECT gf.file_url
      FROM user_gen_files gf
      INNER JOIN project_tag_files ptf ON gf.id = ptf.file_id
      INNER JOIN project_tags pt ON ptf.tag_id = pt.id
      WHERE pt.name = ${tag} AND gf.user_id = ${userId}
    `;

    // Fetch uploaded files associated with the tag
    const uploadedFilesQuery = await sql`
      SELECT uf.file_url
      FROM user_uploaded_files uf
      INNER JOIN project_tag_files ptf ON uf.id = ptf.file_id
      INNER JOIN project_tags pt ON ptf.tag_id = pt.id
      WHERE pt.name = ${tag} AND uf.user_id = ${userId}
    `;

    const images = imagesQuery.rows;
    const messages = messagesQuery.rows;
    const generatedFiles = generatedFilesQuery.rows;
    const uploadedFiles = uploadedFilesQuery.rows;

    const responseData = {
      images: images || [],
      messages: messages || [],
      generatedFiles: generatedFiles || [],
      uploadedFiles: uploadedFiles || []
    };

    console.log("Response data:", responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching objects:", error);
    return NextResponse.json({ error: "Failed to fetch objects" }, { status: 500 });
  }
}
