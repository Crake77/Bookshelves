import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const result = await client.query(`
  SELECT 
    b.id, 
    b.title, 
    b.cover_url, 
    b.authors,
    (SELECT array_agg(sg.name) FROM book_subgenres bsg JOIN subgenres sg ON bsg.subgenre_id = sg.id WHERE bsg.book_id = b.id) as subgenres,
    (SELECT array_agg(ct.name) FROM book_cross_tags bct JOIN cross_tags ct ON bct.cross_tag_id = ct.id WHERE bct.book_id = b.id) as tags,
    (SELECT am.name FROM book_age_markets bam JOIN age_markets am ON bam.age_market_id = am.id WHERE bam.book_id = b.id LIMIT 1) as audience,
    (SELECT f.name FROM book_formats bf JOIN formats f ON bf.format_id = f.id WHERE bf.book_id = b.id LIMIT 1) as format
  FROM books b 
  WHERE b.id = '033508ff-bb34-41d9-aef2-141f4ed8dc84'
`);

console.log(JSON.stringify(result.rows[0], null, 2));

await client.end();
