import { fetch } from 'undici';
import { RateLimiter } from '../../utils/rateLimit.js';

const rateLimiter = new RateLimiter(200, 100); // 200ms + jitter

export type WikidataResult = {
  qid: string;
  revision: string;
  url: string;
  genres: string[];
  subjects: string[];
  characters: string[];
  settings: string[];
  rawData: any;
};

/**
 * Fetch Wikidata info for a book by ISBN
 */
export async function fetchWikidataByISBN(isbn: string): Promise<WikidataResult | null> {
  await rateLimiter.wait();
  
  const query = `
SELECT DISTINCT ?item ?itemLabel ?genre ?genreLabel ?subject ?subjectLabel WHERE {
  ?item wdt:P212 "${isbn}" .  # ISBN-13
  OPTIONAL { ?item wdt:P136 ?genre . }  # genre
  OPTIONAL { ?item wdt:P921 ?subject . }  # main subject
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 50
  `.trim();
  
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.WIKIDATA_USER_AGENT || 'BookshelvesBot/1.0',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`Wikidata query failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as any;
    
    if (!data.results?.bindings?.length) {
      return null;
    }
    
    const bindings = data.results.bindings;
    const firstItem = bindings[0];
    const qid = firstItem.item.value.split('/').pop();
    
    // Extract genres and subjects
    const genres = [...new Set(
      bindings
        .filter((b: any) => b.genreLabel)
        .map((b: any) => b.genreLabel.value)
    )];
    
    const subjects = [...new Set(
      bindings
        .filter((b: any) => b.subjectLabel)
        .map((b: any) => b.subjectLabel.value)
    )];
    
    return {
      qid,
      revision: new Date().toISOString(), // Wikidata doesn't return revision in SPARQL
      url: `https://www.wikidata.org/wiki/${qid}`,
      genres,
      subjects,
      characters: [], // Would need separate query
      settings: [], // Would need separate query
      rawData: data,
    };
  } catch (error) {
    console.warn(`Wikidata fetch error: ${error}`);
    return null;
  }
}

/**
 * Fetch Wikidata info by title and author
 */
export async function fetchWikidataByTitle(
  title: string,
  author: string
): Promise<WikidataResult | null> {
  await rateLimiter.wait();
  
  const query = `
SELECT DISTINCT ?item ?itemLabel ?genre ?genreLabel ?subject ?subjectLabel WHERE {
  ?item wdt:P50 ?authorItem .
  ?authorItem rdfs:label "${author}"@en .
  ?item rdfs:label "${title}"@en .
  OPTIONAL { ?item wdt:P136 ?genre . }
  OPTIONAL { ?item wdt:P921 ?subject . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 20
  `.trim();
  
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.WIKIDATA_USER_AGENT || 'BookshelvesBot/1.0',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json() as any;
    
    if (!data.results?.bindings?.length) {
      return null;
    }
    
    const bindings = data.results.bindings;
    const firstItem = bindings[0];
    const qid = firstItem.item.value.split('/').pop();
    
    const genres = [...new Set(
      bindings
        .filter((b: any) => b.genreLabel)
        .map((b: any) => b.genreLabel.value)
    )];
    
    const subjects = [...new Set(
      bindings
        .filter((b: any) => b.subjectLabel)
        .map((b: any) => b.subjectLabel.value)
    )];
    
    return {
      qid,
      revision: new Date().toISOString(),
      url: `https://www.wikidata.org/wiki/${qid}`,
      genres,
      subjects,
      characters: [],
      settings: [],
      rawData: data,
    };
  } catch (error) {
    console.warn(`Wikidata title search error: ${error}`);
    return null;
  }
}
