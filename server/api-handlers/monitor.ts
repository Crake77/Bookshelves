// api/monitor.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql } from '../lib/api-db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const check = req.query.check as string | undefined;
  
  // Health check only
  if (check === 'health') {
    return res.status(200).json({ ok: true, time: new Date().toISOString() });
  }
  
  // DB test only
  if (check === 'db') {
    try {
      const sql = getSql();
      const rows = await sql/* sql */`select 1 as ok`;
      return res.status(200).json({ ok: (rows as any[])[0]?.ok === 1, rows });
    } catch (e: any) {
      return res.status(200).json({
        ok: false,
        message: 'db test failed',
        error: String(e?.message || e),
      });
    }
  }
  
  // Full monitoring check (default)
  try {
    const sql = getSql();
    const rows = await sql/* sql */`select 1 as ok`;
    const dbOk = (rows as any[])[0]?.ok === 1;
    
    return res.status(200).json({
      health: { ok: true, time: new Date().toISOString() },
      database: { ok: dbOk, rows },
      overall: dbOk
    });
  } catch (e: any) {
    return res.status(200).json({
      health: { ok: true, time: new Date().toISOString() },
      database: {
        ok: false,
        message: 'db test failed',
        error: String(e?.message || e),
      },
      overall: false
    });
  }
}
