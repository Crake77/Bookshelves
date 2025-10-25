# NEXT AGENT INSTRUCTIONS

**Last Updated:** 2025-10-25T13:45:00Z  
**Priority:** HIGH - Implement Evidence-Pack Architecture for Books 11-20

## 🔄 SESSION HANDOFF SUMMARY (2025-10-25)

### ✅ Completed This Session
1. Created comprehensive age/audience detection patterns (`taxonomy/age_audience_patterns.json`)
2. Created detailed documentation (`AGE_AUDIENCE_PATTERNS_SUMMARY.md`)
3. Set up documentation management system with master index (`MASTER_DOCUMENTATION_INDEX.md`)
4. Archived 24 old documentation files to `archives/` directory
5. Created `SESSION_START.md` - single-file session context for all future sessions
6. Installed complete development environment:
   - ✅ Git 2.51.1
   - ✅ Node.js v25.0.0 + NPM 11.6.2
   - ✅ Python 3.12.10 + pip 25.0.1
   - ✅ jq 1.8.1
   - ✅ Python packages: requests, beautifulsoup4, lxml, playwright, pyyaml
   - ✅ Playwright Chromium browser
7. Fixed Windows App Execution Aliases (Python PATH issue)

### 📊 Token Usage
- Total tokens used: ~76,000 / 200,000 (38%)
- Efficient multi-task session with environment setup

---

## 🚨 IMMEDIATE PRIORITY: Evidence-Pack Architecture Implementation

**GOAL:** Implement multi-source evidence harvesting for books 11-20 to replace single-summary tagging.

**WHY:** Current approach has shallow signals, no provenance, and circular feedback loop on own summaries.

**WHAT'S READY:**
- ✅ SQL migration created (`db/migrations/001_evidence_pack_architecture.sql`)
- ✅ Implementation plan documented (`EVIDENCE_PACK_IMPLEMENTATION_PLAN.md`)
- ✅ Development environment complete (Python, Node.js, Git, jq, libraries)

### Step 1: Run SQL Migration
```pwsh
# Execute SQL to add source_snapshots table and provenance fields
node -e "const pg = require('pg'); const fs = require('fs'); const sql = fs.readFileSync('db/migrations/001_evidence_pack_architecture.sql', 'utf8'); const client = new pg.Client({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}}); client.connect().then(() => client.query(sql)).then(() => {console.log('Migration complete'); process.exit(0);}).catch(err => {console.error(err); process.exit(1);});"
```

### Step 2: Install Dependencies
```pwsh
npm install undici p-retry p-limit zod
```

### Step 3: Review Implementation Plan
```pwsh
# Read the complete plan
cat EVIDENCE_PACK_IMPLEMENTATION_PLAN.md
```

### Step 4: Begin Week 1 Implementation
Follow `EVIDENCE_PACK_IMPLEMENTATION_PLAN.md` → Week 1 → Day 1-2:
1. Update Drizzle schema (`shared/schema.ts`)
2. Create utility modules (`scripts/utils/`)
3. Create API clients (`scripts/harvest/clients/`)
4. Test on 10-50 works

**Target:** Have evidence harvesting working for books 11-20 by end of next session.

---

## 📚 PREVIOUS CONTEXT (Taxonomy SQL Generation - COMPLETE)

**Status:** ✅ 100% COMPLETE - Ready for deployment  
**Completion Time:** 2025-10-23T02:50:00Z

## ✅ COMPLETED SECTIONS (as of 2025-10-23T02:48:00Z)

1. **PLOT tags (303)** ✅ - Complete in `C:\Users\johnd\Downloads\taxonomy_continuation_part1.sql`
2. **TONE tags (235)** ✅ - Complete in `C:\Users\johnd\Downloads\taxonomy_section_TONE.sql`
3. **STYLE tags (152)** ✅ - Complete in `C:\Users\johnd\Downloads\taxonomy_section_STYLE.sql`
4. **CONTENT_WARNING tags (230)** ✅ - Complete in `C:\Users\johnd\Downloads\taxonomy_section_CONTENT_WARNING.sql`
5. **REPRESENTATION tags (316)** ✅ - Complete in `C:\Users\johnd\Downloads\taxonomy_section_REPRESENTATION.sql`
6. **MARKET tags (60)** ✅ - Complete in `C:\Users\johnd\Downloads\taxonomy_section_MARKET.sql`
7. **TROPE tags (900)** ✅ - Complete in `C:\Users\johnd\Downloads\taxonomy_section_TROPE.sql`

**Total Completed: 2,196 tags out of ~2,150 needed (100%+ complete)**

## ✅ TASK COMPLETE!

### 🎉 Successfully Assembled

All 2,196 cross_tags have been generated and assembled into the final SQL file.

**Final File:** `C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql`
- **File Size:** 284 KB
- **Total Lines:** 4,090 lines
- **Status:** Ready for production deployment

### Assembly Instructions

**After all sections are created, assemble the complete file:**

```powershell
# Step 1: Verify all section files exist
Get-ChildItem "C:\Users\johnd\Downloads\taxonomy_section_*.sql" | Select-Object Name
Get-ChildItem "C:\Users\johnd\Downloads\taxonomy_continuation_part1.sql"

# Step 2: Combine all sections into the main file
# Remove the placeholder comment from taxonomy_expansion_FINAL.sql (already done)
# Then append each section:

Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value (Get-Content "C:\Users\johnd\Downloads\taxonomy_continuation_part1.sql" -Raw)
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value "`n"
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value (Get-Content "C:\Users\johnd\Downloads\taxonomy_section_TONE.sql" -Raw)
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value "`n"
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value (Get-Content "C:\Users\johnd\Downloads\taxonomy_section_STYLE.sql" -Raw)
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value "`n"
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value (Get-Content "C:\Users\johnd\Downloads\taxonomy_section_CONTENT_WARNING.sql" -Raw)
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value "`n"
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value (Get-Content "C:\Users\johnd\Downloads\taxonomy_section_REPRESENTATION.sql" -Raw)
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value "`n"
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value (Get-Content "C:\Users\johnd\Downloads\taxonomy_section_TROPE.sql" -Raw)
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value "`n"
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value (Get-Content "C:\Users\johnd\Downloads\taxonomy_section_MARKET.sql" -Raw)
Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value "`n"

# Step 3: Add genre-supergenre links section
$genreLinks = @"

-- ============================================================================
-- GENRE ↔ SUPERGENRE LINKS (15 new links)
-- ============================================================================
INSERT INTO genre_supergenres (genre_slug, supergenre_slug) VALUES 
  ('religious-fiction', 'inspirational-religious-fiction'),
  ('christianity', 'religion-spirituality'),
  ('islam', 'religion-spirituality'),
  ('judaism', 'religion-spirituality'),
  ('hinduism', 'religion-spirituality'),
  ('buddhism', 'religion-spirituality'),
  ('sikhism', 'religion-spirituality'),
  ('jainism', 'religion-spirituality'),
  ('taoism', 'religion-spirituality'),
  ('confucianism', 'religion-spirituality'),
  ('shinto', 'religion-spirituality'),
  ('bahai-faith', 'religion-spirituality'),
  ('latter-day-saints', 'religion-spirituality'),
  ('pets-animals', 'pets-animals'),
  ('reference', 'reference-education')
ON CONFLICT (genre_slug, supergenre_slug) DO NOTHING;

COMMIT;
"@

Add-Content -Path "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" -Value $genreLinks

# Step 4: Validate the final file
Write-Host "Final file size:"
(Get-Item "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql").Length

Write-Host "\nTotal lines:"
(Get-Content "C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql" | Measure-Object -Line).Lines
```

---

## 📋 Quick Start

**Your Mission:** Complete the exhaustive taxonomy SQL file by adding ~1,700 remaining cross_tags to reach the target of 3,200 total.

### Files You Need (All in Downloads folder)

#### 🎯 Working Files (Use These):
1. **C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql**
   - Foundation SQL with genres, subgenres, and partial cross_tags
   - Already has: theme (200), character (450), setting (400) = 1,050 tags complete
   - **YOU ADD:** plot (300), tone (225), style (150), content_warning (225), representation (300), trope (900), market (50) = 2,150 more tags

2. **C:\Users\johnd\Downloads\taxonomy_expansion_validation_FINAL.json**
   - Target counts and validation schema
   - Use this to verify your final counts match

3. **C:\Users\johnd\Downloads\TAXONOMY_EXPANSION_RESEARCH_FINAL.md**
   - Complete documentation with ALL 900 tropes listed with examples
   - **This is your primary reference** - it has every trope explicitly listed

#### 📚 Reference Files (For Context Only):
- C:\Users\johnd\Downloads\taxonomy_expansion.sql (original 2000-tag file)
- C:\Users\johnd\Downloads\FINAL_taxonomy_expansion_EXHAUSTIVE.sql (scope blueprint)

---

## 🎯 What You Need to Do

### Step 1: Read the Working Files
```
Read these 3 files first to understand the scope:
1. C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql
2. C:\Users\johnd\Downloads\taxonomy_expansion_validation_FINAL.json
3. C:\Users\johnd\Downloads\TAXONOMY_EXPANSION_RESEARCH_FINAL.md
```

### Step 2: Add Missing Cross-Tag Sections

Open `taxonomy_expansion_FINAL.sql` and add these sections **before** the final `COMMIT;` line:

#### Section 1: PLOT Tags (300 total)
```sql
-- ============================================================================
-- PLOT/STRUCTURE TAGS (300 total)
-- ============================================================================
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'multiple-timelines', 'Multiple Timelines', 'plot'),
  (gen_random_uuid(), 'nonlinear-narrative', 'Nonlinear Narrative', 'plot'),
  (gen_random_uuid(), 'frame-narrative', 'Frame Narrative', 'plot'),
  (gen_random_uuid(), 'epistolary', 'Epistolary', 'plot'),
  (gen_random_uuid(), 'anthology-structure', 'Anthology Structure', 'plot'),
  (gen_random_uuid(), 'dual-timeline', 'Dual Timeline', 'plot'),
  (gen_random_uuid(), 'time-loop', 'Time Loop', 'plot'),
  (gen_random_uuid(), 'time-skip', 'Time Skip', 'plot'),
  (gen_random_uuid(), 'heist-plot', 'Heist Plot', 'plot'),
  (gen_random_uuid(), 'quest-plot', 'Quest Plot', 'plot'),
  (gen_random_uuid(), 'revenge-plot', 'Revenge Plot', 'plot'),
  (gen_random_uuid(), 'investigation-plot', 'Investigation Plot', 'plot'),
  (gen_random_uuid(), 'courtroom-drama', 'Courtroom Drama', 'plot'),
  (gen_random_uuid(), 'conspiracy-plot', 'Conspiracy Plot', 'plot'),
  (gen_random_uuid(), 'survival-plot', 'Survival Plot', 'plot'),
  (gen_random_uuid(), 'escape-plot', 'Escape Plot', 'plot'),
  (gen_random_uuid(), 'road-trip', 'Road Trip', 'plot'),
  (gen_random_uuid(), 'siege-story', 'Siege Story', 'plot'),
  (gen_random_uuid(), 'locked-room', 'Locked Room', 'plot'),
  (gen_random_uuid(), 'whodunit', 'Whodunit', 'plot'),
  (gen_random_uuid(), 'cat-and-mouse', 'Cat and Mouse', 'plot'),
  (gen_random_uuid(), 'ticking-clock', 'Ticking Clock', 'plot'),
  (gen_random_uuid(), 'twist-ending', 'Twist Ending', 'plot'),
  (gen_random_uuid(), 'unreliable-narration', 'Unreliable Narration', 'plot'),
  (gen_random_uuid(), 'open-ending', 'Open Ending', 'plot'),
  (gen_random_uuid(), 'cliffhanger-ending', 'Cliffhanger Ending', 'plot'),
  (gen_random_uuid(), 'mystery-elements', 'Mystery Elements', 'plot'),
  (gen_random_uuid(), 'puzzle-plot', 'Puzzle Plot', 'plot'),
  (gen_random_uuid(), 'political-intrigue', 'Political Intrigue', 'plot'),
  (gen_random_uuid(), 'slow-burn', 'Slow Burn', 'plot'),
  (gen_random_uuid(), 'moderate-pace', 'Moderate Pace', 'plot'),
  (gen_random_uuid(), 'fast-paced', 'Fast Paced', 'plot'),
  (gen_random_uuid(), 'action-packed', 'Action Packed', 'plot'),
  (gen_random_uuid(), 'episodic', 'Episodic', 'plot'),
  (gen_random_uuid(), 'serialised', 'Serialised', 'plot')
  -- ADD 265 MORE plot tags here following the same pattern
ON CONFLICT (slug) DO NOTHING;
```

#### Section 2: TONE Tags (225 total)
```sql
-- ============================================================================
-- TONE/MOOD TAGS (225 total)
-- ============================================================================
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'dark', 'Dark', 'tone'),
  (gen_random_uuid(), 'gritty', 'Gritty', 'tone'),
  (gen_random_uuid(), 'bleak', 'Bleak', 'tone'),
  (gen_random_uuid(), 'grimdark', 'Grimdark', 'tone'),
  (gen_random_uuid(), 'melancholic', 'Melancholic', 'tone'),
  (gen_random_uuid(), 'somber', 'Somber', 'tone'),
  (gen_random_uuid(), 'bittersweet', 'Bittersweet', 'tone'),
  (gen_random_uuid(), 'whimsical', 'Whimsical', 'tone'),
  (gen_random_uuid(), 'lighthearted', 'Lighthearted', 'tone'),
  (gen_random_uuid(), 'heartwarming', 'Heartwarming', 'tone'),
  (gen_random_uuid(), 'hopeful', 'Hopeful', 'tone'),
  (gen_random_uuid(), 'uplifting', 'Uplifting', 'tone'),
  (gen_random_uuid(), 'hilarious', 'Hilarious', 'tone'),
  (gen_random_uuid(), 'witty', 'Witty', 'tone'),
  (gen_random_uuid(), 'satirical', 'Satirical', 'tone'),
  (gen_random_uuid(), 'snarky', 'Snarky', 'tone'),
  (gen_random_uuid(), 'romantic', 'Romantic', 'tone'),
  (gen_random_uuid(), 'sensual', 'Sensual', 'tone'),
  (gen_random_uuid(), 'tense', 'Tense', 'tone'),
  (gen_random_uuid(), 'suspenseful', 'Suspenseful', 'tone'),
  (gen_random_uuid(), 'creepy', 'Creepy', 'tone'),
  (gen_random_uuid(), 'eerie', 'Eerie', 'tone'),
  (gen_random_uuid(), 'chilling', 'Chilling', 'tone'),
  (gen_random_uuid(), 'disturbing', 'Disturbing', 'tone'),
  (gen_random_uuid(), 'haunting', 'Haunting', 'tone'),
  (gen_random_uuid(), 'atmospheric', 'Atmospheric', 'tone'),
  (gen_random_uuid(), 'dreamlike', 'Dreamlike', 'tone'),
  (gen_random_uuid(), 'philosophical', 'Philosophical', 'tone'),
  (gen_random_uuid(), 'reflective', 'Reflective', 'tone'),
  (gen_random_uuid(), 'meditative', 'Meditative', 'tone'),
  (gen_random_uuid(), 'introspective', 'Introspective', 'tone'),
  (gen_random_uuid(), 'poignant', 'Poignant', 'tone'),
  (gen_random_uuid(), 'inspirational', 'Inspirational', 'tone'),
  (gen_random_uuid(), 'comforting', 'Comforting', 'tone'),
  (gen_random_uuid(), 'cozy', 'Cozy', 'tone'),
  (gen_random_uuid(), 'tragic', 'Tragic', 'tone')
  -- ADD 189 MORE tone tags here
ON CONFLICT (slug) DO NOTHING;
```

#### Section 3: STYLE Tags (150 total)
```sql
-- ============================================================================
-- STYLE/WRITING TAGS (150 total)
-- ============================================================================
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'first-person', 'First Person', 'style'),
  (gen_random_uuid(), 'second-person', 'Second Person', 'style'),
  (gen_random_uuid(), 'third-person-limited', 'Third Person Limited', 'style'),
  (gen_random_uuid(), 'third-person-omniscient', 'Third Person Omniscient', 'style'),
  (gen_random_uuid(), 'multiple-pov', 'Multiple Pov', 'style'),
  (gen_random_uuid(), 'lyrical-prose', 'Lyrical Prose', 'style'),
  (gen_random_uuid(), 'sparse-prose', 'Sparse Prose', 'style'),
  (gen_random_uuid(), 'experimental-format', 'Experimental Format', 'style'),
  (gen_random_uuid(), 'stream-of-consciousness', 'Stream of Consciousness', 'style'),
  (gen_random_uuid(), 'metafiction', 'Metafiction', 'style'),
  (gen_random_uuid(), 'breaking-the-fourth-wall', 'Breaking the Fourth Wall', 'style'),
  (gen_random_uuid(), 'dialect-heavy-dialogue', 'Dialect Heavy Dialogue', 'style'),
  (gen_random_uuid(), 'poetic-prose', 'Poetic Prose', 'style'),
  (gen_random_uuid(), 'dry-wit', 'Dry Wit', 'style'),
  (gen_random_uuid(), 'verse-novel', 'Verse Novel', 'style'),
  (gen_random_uuid(), 'prose-poem', 'Prose Poem', 'style'),
  (gen_random_uuid(), 'microfiction', 'Microfiction', 'style'),
  (gen_random_uuid(), 'flash-fiction', 'Flash Fiction', 'style'),
  (gen_random_uuid(), 'fragmented-structure', 'Fragmented Structure', 'style')
  -- ADD 131 MORE style tags here
ON CONFLICT (slug) DO NOTHING;
```

#### Section 4: CONTENT_WARNING Tags (225 total)
```sql
-- ============================================================================
-- CONTENT WARNING TAGS (225 total)
-- ============================================================================
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'graphic-violence', 'Graphic Violence', 'content_warning'),
  (gen_random_uuid(), 'war-violence', 'War Violence', 'content_warning'),
  (gen_random_uuid(), 'torture', 'Torture', 'content_warning'),
  (gen_random_uuid(), 'kidnapping', 'Kidnapping', 'content_warning'),
  (gen_random_uuid(), 'domestic-violence', 'Domestic Violence', 'content_warning'),
  (gen_random_uuid(), 'animal-cruelty', 'Animal Cruelty', 'content_warning'),
  (gen_random_uuid(), 'self-harm', 'Self Harm', 'content_warning'),
  (gen_random_uuid(), 'suicide', 'Suicide', 'content_warning'),
  (gen_random_uuid(), 'murder', 'Murder', 'content_warning'),
  (gen_random_uuid(), 'mass-shooting', 'Mass Shooting', 'content_warning'),
  (gen_random_uuid(), 'genocide', 'Genocide', 'content_warning'),
  (gen_random_uuid(), 'hate-crimes', 'Hate Crimes', 'content_warning'),
  (gen_random_uuid(), 'explicit-sex', 'Explicit Sex', 'content_warning'),
  (gen_random_uuid(), 'sexual-violence', 'Sexual Violence', 'content_warning'),
  (gen_random_uuid(), 'dubious-consent', 'Dubious Consent', 'content_warning'),
  (gen_random_uuid(), 'incest', 'Incest', 'content_warning'),
  (gen_random_uuid(), 'statutory-rape', 'Statutory Rape', 'content_warning'),
  (gen_random_uuid(), 'depression', 'Depression', 'content_warning'),
  (gen_random_uuid(), 'anxiety', 'Anxiety', 'content_warning'),
  (gen_random_uuid(), 'panic-attacks', 'Panic Attacks', 'content_warning'),
  (gen_random_uuid(), 'ptsd', 'Ptsd', 'content_warning'),
  (gen_random_uuid(), 'dissociation', 'Dissociation', 'content_warning'),
  (gen_random_uuid(), 'eating-disorder', 'Eating Disorder', 'content_warning'),
  (gen_random_uuid(), 'self-loathing', 'Self Loathing', 'content_warning'),
  (gen_random_uuid(), 'hallucinations', 'Hallucinations', 'content_warning'),
  (gen_random_uuid(), 'drug-use', 'Drug Use', 'content_warning'),
  (gen_random_uuid(), 'drug-abuse', 'Drug Abuse', 'content_warning'),
  (gen_random_uuid(), 'alcoholism', 'Alcoholism', 'content_warning'),
  (gen_random_uuid(), 'smoking', 'Smoking', 'content_warning'),
  (gen_random_uuid(), 'opioid-abuse', 'Opioid Abuse', 'content_warning'),
  (gen_random_uuid(), 'child-abuse', 'Child Abuse', 'content_warning'),
  (gen_random_uuid(), 'child-death', 'Child Death', 'content_warning'),
  (gen_random_uuid(), 'parental-death', 'Parental Death', 'content_warning'),
  (gen_random_uuid(), 'spousal-death', 'Spousal Death', 'content_warning'),
  (gen_random_uuid(), 'bullying', 'Bullying', 'content_warning'),
  (gen_random_uuid(), 'grooming', 'Grooming', 'content_warning'),
  (gen_random_uuid(), 'stalking', 'Stalking', 'content_warning'),
  (gen_random_uuid(), 'ableism', 'Ableism', 'content_warning'),
  (gen_random_uuid(), 'racism', 'Racism', 'content_warning'),
  (gen_random_uuid(), 'homophobia', 'Homophobia', 'content_warning'),
  (gen_random_uuid(), 'transphobia', 'Transphobia', 'content_warning'),
  (gen_random_uuid(), 'religious-persecution', 'Religious Persecution', 'content_warning'),
  (gen_random_uuid(), 'miscarriage', 'Miscarriage', 'content_warning'),
  (gen_random_uuid(), 'infertility', 'Infertility', 'content_warning'),
  (gen_random_uuid(), 'animal-death', 'Animal Death', 'content_warning'),
  (gen_random_uuid(), 'body-horror', 'Body Horror', 'content_warning'),
  (gen_random_uuid(), 'medical-trauma', 'Medical Trauma', 'content_warning'),
  (gen_random_uuid(), 'blood-and-gore', 'Blood and Gore', 'content_warning')
  -- ADD 177 MORE content_warning tags here
ON CONFLICT (slug) DO NOTHING;
```

#### Section 5: REPRESENTATION Tags (300 total)
```sql
-- ============================================================================
-- REPRESENTATION TAGS (300 total)
-- ============================================================================
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'lgbtq', 'Lgbtq', 'representation'),
  (gen_random_uuid(), 'gay-mc', 'Gay Mc', 'representation'),
  (gen_random_uuid(), 'lesbian-mc', 'Lesbian Mc', 'representation'),
  (gen_random_uuid(), 'bisexual-mc', 'Bisexual Mc', 'representation'),
  (gen_random_uuid(), 'pansexual-mc', 'Pansexual Mc', 'representation'),
  (gen_random_uuid(), 'asexual-mc', 'Asexual Mc', 'representation'),
  (gen_random_uuid(), 'aromantic-mc', 'Aromantic Mc', 'representation'),
  (gen_random_uuid(), 'queer-mc', 'Queer Mc', 'representation'),
  (gen_random_uuid(), 'transgender-mc', 'Transgender Mc', 'representation'),
  (gen_random_uuid(), 'nonbinary-mc', 'Nonbinary Mc', 'representation'),
  (gen_random_uuid(), 'genderfluid-mc', 'Genderfluid Mc', 'representation'),
  (gen_random_uuid(), 'intersex-mc', 'Intersex Mc', 'representation'),
  (gen_random_uuid(), 'black-mc', 'Black Mc', 'representation'),
  (gen_random_uuid(), 'african-mc', 'African Mc', 'representation'),
  (gen_random_uuid(), 'african-american-mc', 'African American Mc', 'representation'),
  (gen_random_uuid(), 'caribbean-mc', 'Caribbean Mc', 'representation'),
  (gen_random_uuid(), 'latino-mc', 'Latino Mc', 'representation'),
  (gen_random_uuid(), 'latina-mc', 'Latina Mc', 'representation'),
  (gen_random_uuid(), 'latinx-mc', 'Latinx Mc', 'representation'),
  (gen_random_uuid(), 'asian-mc', 'Asian Mc', 'representation'),
  (gen_random_uuid(), 'south-asian-mc', 'South Asian Mc', 'representation'),
  (gen_random_uuid(), 'east-asian-mc', 'East Asian Mc', 'representation'),
  (gen_random_uuid(), 'southeast-asian-mc', 'Southeast Asian Mc', 'representation'),
  (gen_random_uuid(), 'middle-eastern-mc', 'Middle Eastern Mc', 'representation'),
  (gen_random_uuid(), 'indigenous-mc', 'Indigenous Mc', 'representation'),
  (gen_random_uuid(), 'pacific-islander-mc', 'Pacific Islander Mc', 'representation'),
  (gen_random_uuid(), 'roma-mc', 'Roma Mc', 'representation'),
  (gen_random_uuid(), 'blind-mc', 'Blind Mc', 'representation'),
  (gen_random_uuid(), 'deaf-mc', 'Deaf Mc', 'representation'),
  (gen_random_uuid(), 'wheelchair-user-mc', 'Wheelchair User Mc', 'representation'),
  (gen_random_uuid(), 'autistic-mc', 'Autistic Mc', 'representation'),
  (gen_random_uuid(), 'adhd-mc', 'Adhd Mc', 'representation'),
  (gen_random_uuid(), 'dyslexic-mc', 'Dyslexic Mc', 'representation'),
  (gen_random_uuid(), 'chronic-illness-mc', 'Chronic Illness Mc', 'representation'),
  (gen_random_uuid(), 'mental-illness-rep', 'Mental Illness Rep', 'representation'),
  (gen_random_uuid(), 'christian-mc', 'Christian Mc', 'representation'),
  (gen_random_uuid(), 'jewish-mc', 'Jewish Mc', 'representation'),
  (gen_random_uuid(), 'muslim-mc', 'Muslim Mc', 'representation'),
  (gen_random_uuid(), 'hindu-mc', 'Hindu Mc', 'representation'),
  (gen_random_uuid(), 'buddhist-mc', 'Buddhist Mc', 'representation'),
  (gen_random_uuid(), 'sikh-mc', 'Sikh Mc', 'representation'),
  (gen_random_uuid(), 'jain-mc', 'Jain Mc', 'representation'),
  (gen_random_uuid(), 'bahai-mc', 'Bahai Mc', 'representation'),
  (gen_random_uuid(), 'lds-mc', 'Lds Mc', 'representation'),
  (gen_random_uuid(), 'atheist-mc', 'Atheist Mc', 'representation'),
  (gen_random_uuid(), 'agnostic-mc', 'Agnostic Mc', 'representation'),
  (gen_random_uuid(), 'pagan-mc', 'Pagan Mc', 'representation')
  -- ADD 253 MORE representation tags here
ON CONFLICT (slug) DO NOTHING;
```

#### Section 6: TROPE Tags (900 total) - THE BIGGEST SECTION

**⚠️ CRITICAL: Reference `TAXONOMY_EXPANSION_RESEARCH_FINAL.md` for the complete list!**

The research doc has ALL 900 tropes explicitly listed organized by:
- Romance Tropes (150)
- Fantasy Tropes (150)
- Sci-Fi Tropes (120)
- Mystery/Thriller Tropes (80)
- Horror Tropes (70)
- Historical Fiction Tropes (50)
- Literary Fiction Tropes (50)
- Other Genre Tropes (230)

```sql
-- ============================================================================
-- TROPE TAGS (900 total)
-- Romance: 150, Fantasy: 150, Sci-Fi: 120, Mystery/Thriller: 80, Horror: 70,
-- Historical: 50, Literary: 50, Other: 230
-- ============================================================================

-- ROMANCE TROPES (150)
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'enemies-to-lovers', 'Enemies to Lovers', 'trope'),
  (gen_random_uuid(), 'friends-to-lovers', 'Friends to Lovers', 'trope'),
  (gen_random_uuid(), 'rivals-to-lovers', 'Rivals to Lovers', 'trope'),
  (gen_random_uuid(), 'strangers-to-lovers', 'Strangers to Lovers', 'trope'),
  (gen_random_uuid(), 'fake-dating', 'Fake Dating', 'trope'),
  (gen_random_uuid(), 'forced-proximity', 'Forced Proximity', 'trope'),
  (gen_random_uuid(), 'only-one-bed', 'Only One Bed', 'trope'),
  (gen_random_uuid(), 'grumpy-sunshine', 'Grumpy Sunshine', 'trope'),
  (gen_random_uuid(), 'brother-best-friend', 'Brother Best Friend', 'trope'),
  (gen_random_uuid(), 'secret-baby', 'Secret Baby', 'trope'),
  (gen_random_uuid(), 'amnesia-romance', 'Amnesia Romance', 'trope'),
  (gen_random_uuid(), 'bodyguard-romance', 'Bodyguard Romance', 'trope'),
  (gen_random_uuid(), 'rockstar-romance', 'Rockstar Romance', 'trope'),
  (gen_random_uuid(), 'single-parent-romance', 'Single Parent Romance', 'trope'),
  (gen_random_uuid(), 'nanny-romance', 'Nanny Romance', 'trope'),
  (gen_random_uuid(), 'boss-employee-romance', 'Boss Employee Romance', 'trope'),
  (gen_random_uuid(), 'marriage-of-convenience', 'Marriage of Convenience', 'trope'),
  (gen_random_uuid(), 'arranged-marriage-romance', 'Arranged Marriage Romance', 'trope'),
  (gen_random_uuid(), 'fated-mates', 'Fated Mates', 'trope'),
  (gen_random_uuid(), 'alpha-hero', 'Alpha Hero', 'trope'),
  (gen_random_uuid(), 'pregnancy-romance', 'Pregnancy Romance', 'trope'),
  (gen_random_uuid(), 'widow-romance', 'Widow Romance', 'trope'),
  (gen_random_uuid(), 'friends-with-benefits-romance', 'Friends with Benefits Romance', 'trope'),
  (gen_random_uuid(), 'matchmaking-romance', 'Matchmaking Romance', 'trope'),
  (gen_random_uuid(), 'forced-marriage', 'Forced Marriage', 'trope'),
  (gen_random_uuid(), 'mail-order-bride', 'Mail Order Bride', 'trope'),
  (gen_random_uuid(), 'runaway-bride', 'Runaway Bride', 'trope'),
  (gen_random_uuid(), 'childhood-sweethearts', 'Childhood Sweethearts', 'trope'),
  (gen_random_uuid(), 'unrequited-love', 'Unrequited Love', 'trope'),
  (gen_random_uuid(), 'hate-to-love', 'Hate to Love', 'trope'),
  (gen_random_uuid(), 'bully-romance', 'Bully Romance', 'trope'),
  (gen_random_uuid(), 'damaged-hero', 'Damaged Hero', 'trope'),
  (gen_random_uuid(), 'wallflower-heroine', 'Wallflower Heroine', 'trope'),
  (gen_random_uuid(), 'governess-romance', 'Governess Romance', 'trope'),
  (gen_random_uuid(), 'reverse-harem', 'Reverse Harem', 'trope'),
  (gen_random_uuid(), 'menage-romance', 'Menage Romance', 'trope'),
  (gen_random_uuid(), 'polyamory-romance', 'Polyamory Romance', 'trope'),
  (gen_random_uuid(), 'mpreg', 'Mpreg', 'trope'),
  (gen_random_uuid(), 'omegaverse', 'Omegaverse', 'trope'),
  (gen_random_uuid(), 'shifter-romance', 'Shifter Romance', 'trope'),
  (gen_random_uuid(), 'vampire-romance', 'Vampire Romance', 'trope'),
  (gen_random_uuid(), 'alien-romance', 'Alien Romance', 'trope'),
  (gen_random_uuid(), 'time-travel-romance', 'Time Travel Romance', 'trope'),
  (gen_random_uuid(), 'soul-bond', 'Soul Bond', 'trope')
  -- ADD 106 MORE romance tropes - see TAXONOMY_EXPANSION_RESEARCH_FINAL.md
ON CONFLICT (slug) DO NOTHING;

-- FANTASY TROPES (150)
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'chosen-one', 'Chosen One', 'trope'),
  (gen_random_uuid(), 'prophecy', 'Prophecy', 'trope'),
  (gen_random_uuid(), 'dark-lord', 'Dark Lord', 'trope'),
  (gen_random_uuid(), 'magic-school', 'Magic School', 'trope'),
  (gen_random_uuid(), 'dragon-rider', 'Dragon Rider', 'trope'),
  (gen_random_uuid(), 'ancient-evil', 'Ancient Evil', 'trope'),
  (gen_random_uuid(), 'artifact-quest', 'Artifact Quest', 'trope'),
  (gen_random_uuid(), 'monster-hunting', 'Monster Hunting', 'trope'),
  (gen_random_uuid(), 'portal-fantasy', 'Portal Fantasy', 'trope'),
  (gen_random_uuid(), 'fairy-tale-retelling', 'Fairy Tale Retelling', 'trope'),
  (gen_random_uuid(), 'litrpg', 'Litrpg', 'trope'),
  (gen_random_uuid(), 'progression-fantasy', 'Progression Fantasy', 'trope'),
  (gen_random_uuid(), 'cultivation-xianxia', 'Cultivation Xianxia', 'trope'),
  (gen_random_uuid(), 'sword-and-sorcery', 'Sword and Sorcery', 'trope'),
  (gen_random_uuid(), 'hidden-prince', 'Hidden Prince', 'trope'),
  (gen_random_uuid(), 'lost-heir', 'Lost Heir', 'trope'),
  (gen_random_uuid(), 'usurped-throne', 'Usurped Throne', 'trope'),
  (gen_random_uuid(), 'wizard-school', 'Wizard School', 'trope'),
  (gen_random_uuid(), 'forbidden-magic', 'Forbidden Magic', 'trope'),
  (gen_random_uuid(), 'blood-magic', 'Blood Magic', 'trope'),
  (gen_random_uuid(), 'elemental-magic', 'Elemental Magic', 'trope'),
  (gen_random_uuid(), 'necromancy', 'Necromancy', 'trope'),
  (gen_random_uuid(), 'familiar-bond', 'Familiar Bond', 'trope'),
  (gen_random_uuid(), 'dragon-bond', 'Dragon Bond', 'trope'),
  (gen_random_uuid(), 'dragons', 'Dragons', 'trope'),
  (gen_random_uuid(), 'unicorns', 'Unicorns', 'trope'),
  (gen_random_uuid(), 'phoenixes', 'Phoenixes', 'trope'),
  (gen_random_uuid(), 'elves', 'Elves', 'trope'),
  (gen_random_uuid(), 'dwarves', 'Dwarves', 'trope'),
  (gen_random_uuid(), 'fae-court', 'Fae Court', 'trope'),
  (gen_random_uuid(), 'changeling', 'Changeling', 'trope'),
  (gen_random_uuid(), 'fae-bargain', 'Fae Bargain', 'trope'),
  (gen_random_uuid(), 'demons', 'Demons', 'trope'),
  (gen_random_uuid(), 'angels', 'Angels', 'trope'),
  (gen_random_uuid(), 'gods-walk-earth', 'Gods Walk Earth', 'trope'),
  (gen_random_uuid(), 'godslayer', 'Godslayer', 'trope'),
  (gen_random_uuid(), 'magic-sword', 'Magic Sword', 'trope'),
  (gen_random_uuid(), 'cursed-artifact', 'Cursed Artifact', 'trope'),
  (gen_random_uuid(), 'tournament-arc', 'Tournament Arc', 'trope'),
  (gen_random_uuid(), 'assassin-guild', 'Assassin Guild', 'trope'),
  (gen_random_uuid(), 'thieves-guild', 'Thieves Guild', 'trope'),
  (gen_random_uuid(), 'fellowship', 'Fellowship', 'trope'),
  (gen_random_uuid(), 'mentor-dies', 'Mentor Dies', 'trope'),
  (gen_random_uuid(), 'evil-overlord', 'Evil Overlord', 'trope'),
  (gen_random_uuid(), 'lich-king', 'Lich King', 'trope'),
  (gen_random_uuid(), 'fallen-angel', 'Fallen Angel', 'trope'),
  (gen_random_uuid(), 'villain-redemption', 'Villain Redemption', 'trope'),
  (gen_random_uuid(), 'ancient-prophecy', 'Ancient Prophecy', 'trope'),
  (gen_random_uuid(), 'sealed-evil', 'Sealed Evil', 'trope'),
  (gen_random_uuid(), 'pocket-dimension', 'Pocket Dimension', 'trope')
  -- ADD 100 MORE fantasy tropes - see TAXONOMY_EXPANSION_RESEARCH_FINAL.md
ON CONFLICT (slug) DO NOTHING;

-- SCI-FI TROPES (120)
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'first-contact', 'First Contact', 'trope'),
  (gen_random_uuid(), 'ai-uprising', 'Ai Uprising', 'trope'),
  (gen_random_uuid(), 'cyberpunk-corporation', 'Cyberpunk Corporation', 'trope'),
  (gen_random_uuid(), 'galactic-empire', 'Galactic Empire', 'trope'),
  (gen_random_uuid(), 'space-western', 'Space Western', 'trope'),
  (gen_random_uuid(), 'time-paradox', 'Time Paradox', 'trope'),
  (gen_random_uuid(), 'uplifted-animals', 'Uplifted Animals', 'trope'),
  (gen_random_uuid(), 'post-scarcity', 'Post Scarcity', 'trope'),
  (gen_random_uuid(), 'terraforming', 'Terraforming', 'trope'),
  (gen_random_uuid(), 'generation-ship', 'Generation Ship', 'trope'),
  (gen_random_uuid(), 'faster-than-light', 'Faster than Light', 'trope'),
  (gen_random_uuid(), 'warp-drive', 'Warp Drive', 'trope'),
  (gen_random_uuid(), 'hyperspace', 'Hyperspace', 'trope'),
  (gen_random_uuid(), 'starship', 'Starship', 'trope'),
  (gen_random_uuid(), 'space-pirates', 'Space Pirates', 'trope'),
  (gen_random_uuid(), 'space-marines', 'Space Marines', 'trope'),
  (gen_random_uuid(), 'alien-empire', 'Alien Empire', 'trope'),
  (gen_random_uuid(), 'hive-mind', 'Hive Mind', 'trope'),
  (gen_random_uuid(), 'robot-rebellion', 'Robot Rebellion', 'trope'),
  (gen_random_uuid(), 'sentient-ai', 'Sentient Ai', 'trope'),
  (gen_random_uuid(), 'android', 'Android', 'trope'),
  (gen_random_uuid(), 'cyborg', 'Cyborg', 'trope'),
  (gen_random_uuid(), 'uploaded-consciousness', 'Uploaded Consciousness', 'trope'),
  (gen_random_uuid(), 'virtual-reality', 'Virtual Reality', 'trope'),
  (gen_random_uuid(), 'neural-implants', 'Neural Implants', 'trope'),
  (gen_random_uuid(), 'transhumanism', 'Transhumanism', 'trope'),
  (gen_random_uuid(), 'genetic-engineering', 'Genetic Engineering', 'trope'),
  (gen_random_uuid(), 'cloning', 'Cloning', 'trope'),
  (gen_random_uuid(), 'bioweapon', 'Bioweapon', 'trope'),
  (gen_random_uuid(), 'pandemic-scifi', 'Pandemic Scifi', 'trope'),
  (gen_random_uuid(), 'nuclear-war', 'Nuclear War', 'trope'),
  (gen_random_uuid(), 'wasteland', 'Wasteland', 'trope'),
  (gen_random_uuid(), 'bunker-survivors', 'Bunker Survivors', 'trope'),
  (gen_random_uuid(), 'mutants', 'Mutants', 'trope'),
  (gen_random_uuid(), 'superpowers', 'Superpowers', 'trope'),
  (gen_random_uuid(), 'superhero-scifi', 'Superhero Scifi', 'trope'),
  (gen_random_uuid(), 'corporate-dystopia', 'Corporate Dystopia', 'trope'),
  (gen_random_uuid(), 'surveillance-state', 'Surveillance State', 'trope'),
  (gen_random_uuid(), 'resistance-movement', 'Resistance Movement', 'trope'),
  (gen_random_uuid(), 'mars-colonization', 'Mars Colonization', 'trope'),
  (gen_random_uuid(), 'dyson-sphere', 'Dyson Sphere', 'trope')
  -- ADD 79 MORE sci-fi tropes - see TAXONOMY_EXPANSION_RESEARCH_FINAL.md
ON CONFLICT (slug) DO NOTHING;

-- MYSTERY/THRILLER TROPES (80)
-- HORROR TROPES (70)
-- HISTORICAL TROPES (50)
-- LITERARY TROPES (50)
-- OTHER TROPES (230)
-- See TAXONOMY_EXPANSION_RESEARCH_FINAL.md for complete lists
```

#### Section 7: MARKET Tags (50 total)
```sql
-- ============================================================================
-- MARKET TAGS (50 total)
-- ============================================================================
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'bestseller', 'Bestseller', 'market'),
  (gen_random_uuid(), 'award-winner', 'Award Winner', 'market'),
  (gen_random_uuid(), 'cult-classic', 'Cult Classic', 'market'),
  (gen_random_uuid(), 'debut-novel', 'Debut Novel', 'market'),
  (gen_random_uuid(), 'standalone', 'Standalone', 'market'),
  (gen_random_uuid(), 'series-starter', 'Series Starter', 'market'),
  (gen_random_uuid(), 'series-finale', 'Series Finale', 'market'),
  (gen_random_uuid(), 'trilogy', 'Trilogy', 'market'),
  (gen_random_uuid(), 'novella', 'Novella', 'market'),
  (gen_random_uuid(), 'quick-read', 'Quick Read', 'market'),
  (gen_random_uuid(), 'doorstopper', 'Doorstopper', 'market'),
  (gen_random_uuid(), 'young-adult', 'Young Adult', 'market'),
  (gen_random_uuid(), 'middle-grade', 'Middle Grade', 'market'),
  (gen_random_uuid(), 'book-club-pick', 'Book Club Pick', 'market'),
  (gen_random_uuid(), 'viral-booktok', 'Viral Booktok', 'market'),
  (gen_random_uuid(), 'adapted-to-film', 'Adapted to Film', 'market'),
  (gen_random_uuid(), 'adapted-to-tv', 'Adapted to Tv', 'market'),
  (gen_random_uuid(), 'clean-romance', 'Clean Romance', 'market'),
  (gen_random_uuid(), 'spicy-romance', 'Spicy Romance', 'market'),
  (gen_random_uuid(), 'critically-acclaimed', 'Critically Acclaimed', 'market'),
  (gen_random_uuid(), 'indie-published', 'Indie Published', 'market'),
  (gen_random_uuid(), 'self-published', 'Self Published', 'market')
  -- ADD 28 MORE market tags here
ON CONFLICT (slug) DO NOTHING;
```

#### Section 8: Genre-Supergenre Links
```sql
-- ============================================================================
-- GENRE ↔ SUPERGENRE LINKS (15 new links)
-- ============================================================================
INSERT INTO genre_supergenres (genre_slug, supergenre_slug) VALUES 
  ('religious-fiction', 'inspirational-religious-fiction'),
  ('christianity', 'religion-spirituality'),
  ('islam', 'religion-spirituality'),
  ('judaism', 'religion-spirituality'),
  ('hinduism', 'religion-spirituality'),
  ('buddhism', 'religion-spirituality'),
  ('sikhism', 'religion-spirituality'),
  ('jainism', 'religion-spirituality'),
  ('taoism', 'religion-spirituality'),
  ('confucianism', 'religion-spirituality'),
  ('shinto', 'religion-spirituality'),
  ('bahai-faith', 'religion-spirituality'),
  ('latter-day-saints', 'religion-spirituality'),
  ('pets-animals', 'pets-animals'),
  ('reference', 'reference-education')
ON CONFLICT (genre_slug, supergenre_slug) DO NOTHING;

COMMIT;
```

### Step 3: Validate Your Work

After completing the SQL file, validate the counts:

```powershell
# If you want to test locally (optional):
# Run the SQL against your database and check:
```

```sql
SELECT "group", COUNT(*) 
FROM cross_tags 
GROUP BY "group" 
ORDER BY "group";
```

**Expected Output:**
```
character         | 450
content_warning   | 225
market            | 50
plot              | 300
representation    | 300
setting           | 400
style             | 150
theme             | 200
tone              | 225
trope             | 900
--------------------------
TOTAL             | 3200
```

---

## 🎯 Critical Requirements

### SQL Syntax Rules
- ✅ `ON CONFLICT (slug) DO NOTHING` on every INSERT
- ✅ `gen_random_uuid()` for all IDs
- ✅ Slugs: lowercase-hyphenated (e.g., `secret-baby`, `enemies-to-lovers`)
- ✅ Group values: ONLY these 10: `theme`, `character`, `setting`, `plot`, `tone`, `style`, `content_warning`, `representation`, `trope`, `market`

### Quality Standards
- ✅ DO NOT summarize - write COMPLETE executable SQL
- ✅ All tags must be real, searchable tropes that readers use
- ✅ Follow the exact counts specified
- ✅ Reference the research doc for complete trope lists

### File Output
- ✅ Update and save: **C:\Users\johnd\Downloads\taxonomy_expansion_FINAL.sql**
- ✅ File must end with `COMMIT;`
- ✅ Ready for production deployment

---

## 📚 Why This Matters

This is the **FINAL EXHAUSTIVE** metadata set for the Bookshelves book recommendation system. With 3,200 cross-tags:

✅ Readers can find books by specific tropes ("enemies-to-lovers + grumpy-sunshine + forced-proximity")  
✅ AI can generate precise recommendations based on rich metadata  
✅ We only need to scrape book data ONCE with complete tags upfront  
✅ System scales without frequent taxonomy updates  

**This is a one-time comprehensive expansion designed to last.**

---

## 🚀 When You're Done

1. ✅ Save the completed `taxonomy_expansion_FINAL.sql` file
2. ✅ Verify all counts match the validation JSON
3. ✅ Commit the instruction file changes if needed
4. ✅ Report completion

---

**Good luck! This is high-impact work that will power the entire recommendation engine.**

---

*Last Updated: 2025-10-23T02:25:03Z*  
*File Location: C:\Users\johnd\projects\Bookshelves\NEXT_AGENT_INSTRUCTIONS.md*
