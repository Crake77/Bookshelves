// api/notes.ts
import { prisma } from '../../lib/prisma';

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const notes = await prisma.note.findMany({ orderBy: { createdAt: 'desc' } });
      return res.status(200).json({ notes });
    }

    if (req.method === 'POST') {
      const { title } = (req.body ?? {}) as { title?: string };
      if (!title) return res.status(400).json({ error: 'title required' });

      const note = await prisma.note.create({ data: { title } });
      return res.status(201).json({ note });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
