// Test the production browse API to see what it returns
const PROD_URL = 'https://bookshelves-82azf4jif-john-dunhams-projects-39f6d8ce.vercel.app';

async function testAPI() {
  console.log('🧪 Testing Production Browse API\n');
  console.log('='.repeat(80));
  
  try {
    const url = `${PROD_URL}/api/browse?algo=popular&limit=20`;
    console.log(`📡 Requesting: ${url}\n`);
    
    const response = await fetch(url);
    const status = response.status;
    const statusText = response.statusText;
    
    console.log(`📊 Status: ${status} ${statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:');
      console.log(errorText);
      return;
    }
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      console.log(`✅ Response: Array with ${data.length} items\n`);
      
      if (data.length === 0) {
        console.log('⚠️  WARNING: API returned empty array!');
        console.log('   This means the query is running but returning no results.');
        console.log('   Possible causes:');
        console.log('   - Database connection issue');
        console.log('   - Query filters excluding all books');
        console.log('   - Books table is empty in production database');
      } else {
        console.log('📚 Books returned:');
        data.slice(0, 5).forEach((book, i) => {
          console.log(`   ${i + 1}. ${book.title || 'No title'} (ID: ${book.id || 'No ID'})`);
        });
        if (data.length > 5) {
          console.log(`   ... and ${data.length - 5} more`);
        }
      }
    } else {
      console.log('❌ Response is not an array:');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error(error.stack);
  }
  
  console.log('\n' + '='.repeat(80));
}

testAPI();

