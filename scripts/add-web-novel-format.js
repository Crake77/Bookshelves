// Add web-novel format to database
import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to database\n');

  try {
    // Check if web-novel already exists
    const checkResult = await client.query(
      'SELECT id, slug, name FROM formats WHERE slug = $1',
      ['web-novel']
    );

    if (checkResult.rows.length > 0) {
      console.log(`✅ Format 'web-novel' already exists: ${checkResult.rows[0].name}`);
    } else {
      // Insert web-novel format
      const insertResult = await client.query(
        `INSERT INTO formats (slug, name, description, enabled)
         VALUES ($1, $2, $3, $4)
         RETURNING id, slug, name`,
        [
          'web-novel',
          'Web Novel',
          'Online serialized fiction, often published chapter-by-chapter on platforms like Royal Road, Webnovel, or similar sites',
          true
        ]
      );
      console.log(`✅ Added format: ${insertResult.rows[0].name} (${insertResult.rows[0].slug})`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);

