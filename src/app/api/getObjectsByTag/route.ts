import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const tag = request.nextUrl.searchParams.get('tag');
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');

  if (!userId || !tag || !workspaceId) {
    console.error("User ID, tag, and workspace ID are required");
    return NextResponse.json({ error: 'User ID, tag, and workspace ID are required' }, { status: 400 });
  }

  try {
    console.log(`Fetching objects for tag: ${tag} in workspace: ${workspaceId}`);

    // Fetch images associated with the tag and workspace
    const imagesQuery = await sql`
      SELECT img.image_url, img.thumbnail_url
      FROM user_gen_images img
      INNER JOIN project_tag_images pti ON img.id = pti.image_id
      WHERE pti.tag_id IN (
        SELECT id FROM project_tags WHERE name = ${tag} AND workspace_id = ${workspaceId}
      ) AND img.workspace_id = ${workspaceId}
    `;
    
    // Fetch messages associated with the tag and workspace
    const messagesQuery = await sql`
      SELECT msg.message_url
      FROM user_gen_messages msg
      INNER JOIN project_tag_messages ptm ON msg.id = ptm.message_id
      WHERE ptm.tag_id IN (
        SELECT id FROM project_tags WHERE name = ${tag} AND workspace_id = ${workspaceId}
      ) AND msg.workspace_id = ${workspaceId}
    `;

    // Fetch generated files associated with the tag and workspace
    const generatedFilesQuery = await sql`
      SELECT gf.file_url
      FROM user_gen_files gf
      INNER JOIN project_tag_files ptf ON gf.id = ptf.file_id
      WHERE ptf.tag_id IN (
        SELECT id FROM project_tags WHERE name = ${tag} AND workspace_id = ${workspaceId}
      ) AND gf.workspace_id = ${workspaceId}
    `;

    // Fetch uploaded files associated with the tag and workspace
    const uploadedFilesQuery = await sql`
      SELECT uf.file_url
      FROM user_uploaded_files uf
      INNER JOIN project_tag_files ptf ON uf.id = ptf.file_id
      WHERE ptf.tag_id IN (
        SELECT id FROM project_tags WHERE name = ${tag} AND workspace_id = ${workspaceId}
      ) AND uf.workspace_id = ${workspaceId}
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
