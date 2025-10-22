#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema.ts';
import {
  DOMAINS,
  SUPERGENRES, 
  GENRES,
  SUBGENRES,
  FORMATS,
  AGE_MARKETS,
  CROSS_TAGS,
  SUBGENRE_GENRE_LINKS,
  ALIASES
} from './taxonomy-seed.ts';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9LouUjhcil4Q@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function seedTaxonomy() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    console.log('🌱 Starting taxonomy seeding...');

    // Clear existing data in reverse dependency order
    console.log('🧹 Clearing existing taxonomy data...');
    await db.delete(schema.aliases);
    await db.delete(schema.subgenreGenres);
    await db.delete(schema.genreSupergenres);
    await db.delete(schema.genreDomains);
    await db.delete(schema.supergenreDomains);
    await db.delete(schema.bookCrossTags);
    await db.delete(schema.bookAgeMarkets);
    await db.delete(schema.bookFormats);
    await db.delete(schema.bookSubgenres);
    await db.delete(schema.bookGenres);
    await db.delete(schema.bookSupergenres);
    await db.delete(schema.bookDomains);
    await db.delete(schema.subgenres);
    await db.delete(schema.genres);
    await db.delete(schema.supergenres);
    await db.delete(schema.domains);
    await db.delete(schema.formats);
    await db.delete(schema.ageMarkets);
    await db.delete(schema.crossTags);

    // 1. Insert Domains
    console.log('📂 Seeding domains...');
    const domainInserts = DOMAINS.map(domain => ({
      slug: domain.slug,
      name: domain.name,
      enabled: true
    }));
    await db.insert(schema.domains).values(domainInserts);
    const domainMap = new Map();
    const domains = await db.select().from(schema.domains);
    domains.forEach(domain => domainMap.set(domain.slug, domain.id));
    console.log(`✅ Inserted ${domains.length} domains`);

    // 2. Insert Supergenres
    console.log('📚 Seeding supergenres...');
    const supergenreInserts = SUPERGENRES.map(sg => ({
      slug: sg.slug,
      name: sg.name,
      description: sg.description || null,
      enabled: true
    }));
    await db.insert(schema.supergenres).values(supergenreInserts);
    const supergenreMap = new Map();
    const supergenres = await db.select().from(schema.supergenres);
    supergenres.forEach(sg => supergenreMap.set(sg.slug, sg.id));
    console.log(`✅ Inserted ${supergenres.length} supergenres`);

    // 3. Insert Genres
    console.log('🎭 Seeding genres...');
    const genreInserts = GENRES.map(genre => ({
      slug: genre.slug,
      name: genre.name,
      description: genre.description || null,
      enabled: true
    }));
    await db.insert(schema.genres).values(genreInserts);
    const genreMap = new Map();
    const genres = await db.select().from(schema.genres);
    genres.forEach(genre => genreMap.set(genre.slug, genre.id));
    console.log(`✅ Inserted ${genres.length} genres`);

    // 4. Insert Subgenres
    console.log('🏷️ Seeding subgenres...');
    const subgenreInserts = SUBGENRES.map(subgenre => ({
      genreId: genreMap.get(subgenre.parent),
      slug: subgenre.slug,
      name: subgenre.name,
      description: subgenre.description || null,
      enabled: true
    })).filter(sg => sg.genreId); // Only insert if parent genre exists
    await db.insert(schema.subgenres).values(subgenreInserts);
    const subgenreMap = new Map();
    const subgenres = await db.select().from(schema.subgenres);
    subgenres.forEach(sg => subgenreMap.set(sg.slug, sg.id));
    console.log(`✅ Inserted ${subgenres.length} subgenres`);

    // 5. Insert Formats
    console.log('📖 Seeding formats...');
    const formatInserts = FORMATS.map(format => ({
      slug: format.slug,
      name: format.name,
      description: format.description || null,
      enabled: true
    }));
    await db.insert(schema.formats).values(formatInserts);
    const formats = await db.select().from(schema.formats);
    console.log(`✅ Inserted ${formats.length} formats`);

    // 6. Insert Age Markets
    console.log('👶 Seeding age markets...');
    const ageMarketInserts = AGE_MARKETS.map(am => ({
      slug: am.slug,
      name: am.name,
      minAge: am.min_age || null,
      maxAge: am.max_age || null,
      enabled: true
    }));
    await db.insert(schema.ageMarkets).values(ageMarketInserts);
    const ageMarkets = await db.select().from(schema.ageMarkets);
    console.log(`✅ Inserted ${ageMarkets.length} age markets`);

    // 7. Insert Cross Tags
    console.log('🏷️ Seeding cross tags...');
    const crossTagInserts = CROSS_TAGS.map(tag => ({
      group: tag.group,
      slug: tag.slug,
      name: tag.name,
      description: tag.description || null,
      enabled: true
    }));
    await db.insert(schema.crossTags).values(crossTagInserts);
    const crossTags = await db.select().from(schema.crossTags);
    console.log(`✅ Inserted ${crossTags.length} cross tags`);

    // 8. Insert Relationship Data

    // Supergenre-Domain relationships
    console.log('🔗 Creating supergenre-domain relationships...');
    const supergenreDomainInserts = [];
    SUPERGENRES.forEach(sg => {
      if (sg.domains) {
        sg.domains.forEach(domainSlug => {
          const supergenreId = supergenreMap.get(sg.slug);
          const domainId = domainMap.get(domainSlug);
          if (supergenreId && domainId) {
            supergenreDomainInserts.push({
              supergenreId,
              domainId
            });
          }
        });
      }
    });
    if (supergenreDomainInserts.length > 0) {
      await db.insert(schema.supergenreDomains).values(supergenreDomainInserts);
    }
    console.log(`✅ Created ${supergenreDomainInserts.length} supergenre-domain links`);

    // Genre-Domain relationships
    console.log('🔗 Creating genre-domain relationships...');
    const genreDomainInserts = [];
    GENRES.forEach(genre => {
      if (genre.domains) {
        genre.domains.forEach(domainSlug => {
          const genreId = genreMap.get(genre.slug);
          const domainId = domainMap.get(domainSlug);
          if (genreId && domainId) {
            genreDomainInserts.push({
              genreId,
              domainId
            });
          }
        });
      }
    });
    if (genreDomainInserts.length > 0) {
      await db.insert(schema.genreDomains).values(genreDomainInserts);
    }
    console.log(`✅ Created ${genreDomainInserts.length} genre-domain links`);

    // Genre-Supergenre relationships
    console.log('🔗 Creating genre-supergenre relationships...');
    const genreSupergenreInserts = [];
    GENRES.forEach(genre => {
      if (genre.supergenres) {
        genre.supergenres.forEach(supergenreSlug => {
          const genreId = genreMap.get(genre.slug);
          const supergenreId = supergenreMap.get(supergenreSlug);
          if (genreId && supergenreId) {
            genreSupergenreInserts.push({
              genreId,
              supergenreId
            });
          }
        });
      }
    });
    if (genreSupergenreInserts.length > 0) {
      await db.insert(schema.genreSupergenres).values(genreSupergenreInserts);
    }
    console.log(`✅ Created ${genreSupergenreInserts.length} genre-supergenre links`);

    // Subgenre-Genre cross-attachments
    console.log('🔗 Creating subgenre cross-attachments...');
    const subgenreGenreInserts = [];
    SUBGENRES.forEach(subgenre => {
      if (subgenre.crossAttach) {
        subgenre.crossAttach.forEach(genreSlug => {
          const subgenreId = subgenreMap.get(subgenre.slug);
          const genreId = genreMap.get(genreSlug);
          if (subgenreId && genreId) {
            subgenreGenreInserts.push({
              subgenreId,
              genreId
            });
          }
        });
      }
    });
    
    // Also add from SUBGENRE_GENRE_LINKS if it exists
    if (typeof SUBGENRE_GENRE_LINKS !== 'undefined') {
      SUBGENRE_GENRE_LINKS.forEach(link => {
        const subgenreId = subgenreMap.get(link.subgenre);
        const genreId = genreMap.get(link.genre);
        if (subgenreId && genreId) {
          subgenreGenreInserts.push({
            subgenreId,
            genreId
          });
        }
      });
    }
    
    if (subgenreGenreInserts.length > 0) {
      await db.insert(schema.subgenreGenres).values(subgenreGenreInserts);
    }
    console.log(`✅ Created ${subgenreGenreInserts.length} subgenre cross-attachments`);

    // 9. Insert Aliases
    console.log('🏷️ Seeding aliases...');
    if (typeof ALIASES !== 'undefined' && ALIASES.length > 0) {
      const aliasInserts = ALIASES.map(alias => ({
        kind: alias.kind,
        alias: alias.alias,
        canonicalSlug: alias.canonical_slug
      }));
      await db.insert(schema.aliases).values(aliasInserts);
      console.log(`✅ Inserted ${ALIASES.length} aliases`);
    } else {
      console.log('⚠️ No aliases found in seed data');
    }

    console.log('🎉 Taxonomy seeding completed successfully!');
    console.log(`
📊 Summary:
   • ${domains.length} domains
   • ${supergenres.length} supergenres  
   • ${genres.length} genres
   • ${subgenres.length} subgenres
   • ${formats.length} formats
   • ${ageMarkets.length} age markets
   • ${crossTags.length} cross tags
   • ${supergenreDomainInserts.length} supergenre-domain links
   • ${genreDomainInserts.length} genre-domain links
   • ${genreSupergenreInserts.length} genre-supergenre links
   • ${subgenreGenreInserts.length} subgenre cross-attachments
    `);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedTaxonomy();