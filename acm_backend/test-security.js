// Security test script to verify the implemented security improvements
// This script tests various security scenarios to ensure the system is secure

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Test scenarios
const tests = [
  {
    name: 'Health Check',
    test: async () => {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.status === 200;
    }
  },
  {
    name: 'Unauthenticated Access to Admin Endpoint',
    test: async () => {
      try {
        await axios.get(`${API_BASE_URL}/admin/members`);
        return false; // Should not reach here
      } catch (error) {
        return error.response?.status === 401; // Should be unauthorized
      }
    }
  },
  {
    name: 'Invalid Token Access',
    test: async () => {
      try {
        await axios.get(`${API_BASE_URL}/admin/members`, {
          headers: { 'Authorization': 'Bearer invalid-token' }
        });
        return false; // Should not reach here
      } catch (error) {
        return error.response?.status === 403; // Should be forbidden
      }
    }
  },
  {
    name: 'User Role Endpoint Authentication Required',
    test: async () => {
      try {
        await axios.get(`${API_BASE_URL}/user/role`);
        return false; // Should not reach here
      } catch (error) {
        return error.response?.status === 401; // Should be unauthorized
      }
    }
  },
  {
    name: 'Admin Delete User Endpoint Protection',
    test: async () => {
      try {
        await axios.post(`${API_BASE_URL}/admin/deleteUser`, { uid: 'test-uid' });
        return false; // Should not reach here
      } catch (error) {
        return error.response?.status === 401; // Should be unauthorized
      }
    }
  }
];

// Run tests
async function runSecurityTests() {
  console.log('🔐 Running Security Tests...\n');
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All security tests passed! The system is properly secured.');
  } else {
    console.log('⚠️  Some security tests failed. Please review the implementation.');
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Security Test Suite for ACM Website\n');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running. Please start the backend server first.');
    console.log('   Run: cd acm_backend && npm start');
    process.exit(1);
  }
  
  await runSecurityTests();
}

main().catch(console.error);