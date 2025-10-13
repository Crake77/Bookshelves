// api/db-test.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from './_db';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const sql = getSql();
    const rows = await sql/* sql */`select 1 as ok`;
    return res.status(200).json({ ok: rows[0]?.ok === 1, rows });
  } catch (e: any) {
    return res.status(200).json({
      ok: false,
      message: 'db test failed',
      error: String(e?.message || e),
    });
  }
}
