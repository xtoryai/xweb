import fs from 'node:fs';
import path from 'node:path';

/**
 * POST /api/reload — re-sync template files and restart the server.
 * Call after uploading changed template files to the templates/ volume.
 */
export async function POST() {
  try {
    // Touch the signal file to trigger template re-sync + server restart
    const signalPath = path.join(process.cwd(), 'src', '_template_changed');
    fs.writeFileSync(signalPath, Date.now().toString());

    return new Response(JSON.stringify({ ok: true, message: 'Reloading...' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
