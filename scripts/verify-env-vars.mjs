// Verify environment variables are correctly set
import 'dotenv/config';

console.log('🔍 Verifying Environment Variables\n');
console.log('='.repeat(80));

// Check DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log('❌ DATABASE_URL: NOT SET');
} else {
  // Check if it's complete
  const isComplete = dbUrl.includes('@') && dbUrl.includes('.neon.tech') && dbUrl.includes('/neondb');
  if (isComplete) {
    // Mask password for security
    const masked = dbUrl.replace(/:(.*?)@/, ':****@');
    console.log('✅ DATABASE_URL: SET');
    console.log(`   ${masked}`);
    
    // Check if it's the pooler URL (recommended for serverless)
    if (dbUrl.includes('pooler')) {
      console.log('   ✅ Using pooler (recommended for Vercel)');
    } else {
      console.log('   ⚠️  Not using pooler - may cause connection issues');
    }
  } else {
    console.log('❌ DATABASE_URL: INCOMPLETE OR MALFORMED');
    console.log(`   Current: ${dbUrl.substring(0, 50)}...`);
    console.log('   Should be: postgresql://user:pass@host.neon.tech/neondb?sslmode=require');
  }
}

// Extract from user's message
const userDbUrl = "postgresql://neondb_owner:npg_9LouUjhcil4Q@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";
console.log('\n📋 Expected DATABASE_URL from your message:');
console.log(`   postgresql://neondb_owner:****@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require`);

console.log('\n' + '='.repeat(80));
console.log('\n📝 To set in Vercel:');
console.log('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
console.log('2. Add variable: DATABASE_URL');
console.log('3. Value: postgresql://neondb_owner:npg_9LouUjhcil4Q@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require');
console.log('4. Select environment: Production (and Preview if needed)');
console.log('5. Save and redeploy');
console.log('\n');

