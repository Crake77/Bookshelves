// Test series filter functionality
const PREVIEW_URL = 'https://bookshelves-puspmx4s4-john-dunhams-projects-39f6d8ce.vercel.app';

async function testSeriesFilter() {
  console.log('🧪 Testing Series Filter Functionality\n');
  console.log('='.repeat(80));
  
  const tests = [
    {
      name: 'Browse without series filter',
      url: `${PREVIEW_URL}/api/browse?algo=popular&limit=20`,
    },
    {
      name: 'Browse with series filter (Wheel of Time)',
      url: `${PREVIEW_URL}/api/browse?algo=popular&limit=20&series=wheel-of-time`,
    },
    {
      name: 'Browse with series + position filter (main sequence only)',
      url: `${PREVIEW_URL}/api/browse?algo=popular&limit=20&series=wheel-of-time&seriesPosition=true`,
    },
  ];
  
  for (const test of tests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url);
      const status = response.status;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ Status: ${status}`);
        console.log(`   Error: ${errorText}`);
        continue;
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        console.log(`   ✅ Status: ${status}`);
        console.log(`   📚 Books returned: ${data.length}`);
        if (data.length > 0) {
          console.log(`   Sample: ${data[0].title || 'No title'}`);
        }
      } else {
        console.log(`   ⚠️  Unexpected response format:`);
        console.log(`   ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

testSeriesFilter();

