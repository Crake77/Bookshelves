import { db } from "../db/index.js";
import { works, editions } from "@shared/schema.js";
import { eq } from "drizzle-orm";

const eye = await db
  .select({
    id: works.id,
    title: works.title,
    series: works.series,
    seriesOrder: works.seriesOrder,
  })
  .from(works)
  .where(eq(works.title, "The Eye of the World"))
  .limit(1)
  .execute();

console.log("Work:", JSON.stringify(eye, null, 2));

if (eye.length > 0) {
  const ed = await db
    .select({
      id: editions.id,
      googleBooksId: editions.googleBooksId,
      legacyBookId: editions.legacyBookId,
    })
    .from(editions)
    .where(eq(editions.workId, eye[0].id))
    .limit(1)
    .execute();
  console.log("Edition:", JSON.stringify(ed, null, 2));
  
  // Also check by googleBooksId
  const edByGoogleId = await db
    .select({
      id: editions.id,
      googleBooksId: editions.googleBooksId,
      workId: editions.workId,
    })
    .from(editions)
    .where(eq(editions.googleBooksId, "pZJ2H63MAioC"))
    .limit(1)
    .execute();
  console.log("Edition by googleBooksId (pZJ2H63MAioC):", JSON.stringify(edByGoogleId, null, 2));
}

process.exit(0);

