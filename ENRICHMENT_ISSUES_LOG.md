# Metadata Enrichment Issues Log

**Purpose:** Track all books with incomplete or missing metadata fields for manual review and completion.

**Last Updated:** 2025-10-23

---

## How to Use This Log

- This file is **automatically updated** by the GPT agent after each batch
- Each book with missing optional fields is logged with specific details
- Use this to prioritize manual data entry or API retries
- Once an issue is resolved manually, mark it as `[RESOLVED]` or remove the entry

---

## 🚨 Books Missing REQUIRED Fields

**CRITICAL:** These books should not have been processed. They require immediate attention.

### Missing Authors

_(No entries - authors are REQUIRED for all books)_

### Missing Summary/Description

_(No entries - summaries are REQUIRED for all books)_

### Missing Taxonomy Tags

_(No entries - domain/supergenre/genre/cross-tags are REQUIRED)_

---

## ⚠️ Books Missing OPTIONAL Fields

### Missing Cover Image URLs

**Book ID** | **Title** | **Author(s)** | **ISBN** | **Batch** | **Note**
----------- | --------- | ------------- | -------- | --------- | --------
_Example entries will appear here after processing batches_

**Instructions for Manual Resolution:**
1. Search Google Books API manually: `https://www.googleapis.com/books/v1/volumes?q=isbn:{ISBN}`
2. Check OpenLibrary: `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`
3. If found, update database: `UPDATE books SET cover_image_url = 'URL' WHERE id = 'book-id';`
4. Mark entry as `[RESOLVED]` in this log

---

### Missing Published Dates

**Book ID** | **Title** | **Author(s)** | **ISBN** | **Batch** | **Note**
----------- | --------- | ------------- | -------- | --------- | --------
_Example entries will appear here after processing batches_

**Instructions for Manual Resolution:**
1. Check WorldCat: `https://www.worldcat.org/search?q={ISBN}`
2. Check publisher websites or Amazon
3. Update database: `UPDATE books SET published_date = 'YYYY-MM-DD' WHERE id = 'book-id';`
4. Mark entry as `[RESOLVED]` in this log

---

### Missing Page Counts

**Book ID** | **Title** | **Author(s)** | **ISBN** | **Batch** | **Note**
----------- | --------- | ------------- | -------- | --------- | --------
_Example entries will appear here after processing batches_

**Instructions for Manual Resolution:**
1. Check Google Books, WorldCat, or Amazon
2. Update database: `UPDATE books SET page_count = N WHERE id = 'book-id';`
3. Mark entry as `[RESOLVED]` in this log

---

### Missing Publishers

**Book ID** | **Title** | **Author(s)** | **ISBN** | **Batch** | **Note**
----------- | --------- | ------------- | -------- | --------- | --------
_Example entries will appear here after processing batches_

---

### Missing Format Information

**Book ID** | **Title** | **Author(s)** | **ISBN** | **Batch** | **Note**
----------- | --------- | ------------- | -------- | --------- | --------
_Example entries will appear here after processing batches_

**Instructions for Manual Resolution:**
1. Determine format (hardcover/paperback/ebook/audiobook)
2. Insert link: `INSERT INTO book_formats (book_id, format_slug) VALUES ('book-id', 'format-slug');`
3. Mark entry as `[RESOLVED]` in this log

---

### Uncertain Audience/Age Market

**Book ID** | **Title** | **Author(s)** | **ISBN** | **Batch** | **Note**
----------- | --------- | ------------- | -------- | --------- | --------
_Example entries will appear here after processing batches_

**Instructions for Manual Resolution:**
1. Review book description and themes
2. Insert link: `INSERT INTO book_age_markets (book_id, age_market_slug) VALUES ('book-id', 'age-market-slug');`
3. Values: `adult`, `young-adult`, `middle-grade`, `children`
4. Mark entry as `[RESOLVED]` in this log

---

## 📊 Summary Statistics (All Batches)

**Field** | **Total Missing** | **% of Books Processed**
--------- | ----------------- | ------------------------
cover_image_url | 0 | 0.0%
published_date | 0 | 0.0%
page_count | 0 | 0.0%
publisher | 0 | 0.0%
format | 0 | 0.0%
audience | 0 | 0.0%

**Last Batch Processed:** N/A  
**Total Books Processed:** 0  
**Books with At Least One Missing Field:** 0

---

## 📝 Batch-by-Batch Issue Summary

### Batch 1 (Books 1-100)
- **Date:** TBD
- **Total Issues:** 0
- **Resolved:** 0
- **Pending:** 0

---

## 🔧 Maintenance Notes

### Bulk Resolution Scripts

If you need to batch-resolve issues (e.g., retry cover URL fetching for all books missing covers):

```sql
-- Example: Retry OpenLibrary covers for books missing cover_image_url
UPDATE books
SET cover_image_url = CONCAT('https://covers.openlibrary.org/b/isbn/', isbn_13, '-L.jpg')
WHERE cover_image_url IS NULL 
  AND isbn_13 IS NOT NULL;
```

### Periodic Re-checks

Consider running these queries periodically to refresh this log:

```sql
-- Books missing cover_image_url
SELECT id, title, authors, isbn_13 
FROM books 
WHERE cover_image_url IS NULL 
ORDER BY id;

-- Books missing published_date
SELECT id, title, authors, isbn_13 
FROM books 
WHERE published_date IS NULL 
ORDER BY id;

-- Books missing page_count
SELECT id, title, authors, isbn_13 
FROM books 
WHERE page_count IS NULL 
ORDER BY id;
```

---

## Archive of Resolved Issues

_(Move resolved entries here to keep main log clean)_

### Resolved - Missing Cover URLs

**Book ID** | **Title** | **Resolved Date** | **Resolution**
----------- | --------- | ----------------- | --------------
_Resolved entries will appear here_

### Resolved - Missing Dates

**Book ID** | **Title** | **Resolved Date** | **Resolution**
----------- | --------- | ----------------- | --------------
_Resolved entries will appear here_

---

**End of Log**
