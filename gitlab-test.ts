// Simple test for GitLab service
// You can run this in the browser console to test the GitLab integration

import { GitLabService } from './src/services/gitlabService';

// Test configuration
const testConfig = {
  repository: 'https://gitlab.com/imparano/engineering/teachino-ai',
  filePath: 'teachino_ai/ai/data/messages/defaults/system_message_agents_material_knowledge.py',
  variableName: 'instructions_open_question_guidance',
  defaultBranch: 'main'
};

// Test functions
async function testAuthentication() {
  const token = prompt('Enter your GitLab Personal Access Token for testing:');
  if (!token) {
    console.log('❌ No token provided');
    return false;
  }
  
  try {
    GitLabService.setAccessToken(token);
    // Test the token by fetching branches
    await GitLabService.getBranches();
    console.log('✅ Token set and validated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to validate token:', error);
    GitLabService.clearAccessToken();
    return false;
  }
}

async function testGetBranches() {
  try {
    console.log('Testing GitLab branches fetch...');
    const branches = await GitLabService.getBranches();
    console.log('✅ Branches fetched successfully:', branches);
    return branches;
  } catch (error) {
    console.error('❌ Failed to fetch branches:', error);
    if (error instanceof Error && error.message.includes('authentication')) {
      console.log('💡 Hint: Run testAuthentication() first to set your GitLab token');
    }
    return null;
  }
}

async function testGetPrompt(branch = 'main') {
  try {
    console.log(`Testing GitLab prompt fetch from branch: ${branch}...`);
    const prompt = await GitLabService.getPrompt(testConfig, branch);
    console.log('✅ Prompt fetched successfully:', prompt.substring(0, 100) + '...');
    return prompt;
  } catch (error) {
    console.error('❌ Failed to fetch prompt:', error);
    if (error instanceof Error && error.message.includes('authentication')) {
      console.log('💡 Hint: Run testAuthentication() first to set your GitLab token');
    }
    return null;
  }
}

async function testValidateConfig() {
  const validation = GitLabService.validateConfig(testConfig);
  console.log('Config validation:', validation);
  return validation;
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Starting GitLab Service Tests...');
  
  // Test config validation
  await testValidateConfig();
  
  // Check if authenticated
  const hasToken = localStorage.getItem('gitlab_access_token');
  if (!hasToken) {
    console.log('⚠️  No GitLab token found. Run testAuthentication() first.');
    return;
  }
  
  // Test branches
  const branches = await testGetBranches();
  
  // Test prompt fetch
  if (branches && branches.length > 0) {
    await testGetPrompt(branches[0].name);
  }
  
  console.log('🏁 Tests completed!');
}

function clearAuthentication() {
  GitLabService.clearAccessToken();
  console.log('🗑️ GitLab token cleared');
}

// Export for manual testing
if (typeof window !== 'undefined') {
  (window as any).testGitLab = {
    runAllTests,
    testAuthentication,
    testGetBranches,
    testGetPrompt,
    testValidateConfig,
    clearAuthentication,
    GitLabService
  };
  console.log('GitLab tests available at window.testGitLab');
  console.log('💡 Note: You can now set your GitLab token directly in the navigation bar!');
  console.log('💡 Or use: window.testGitLab.testAuthentication() for testing');
}

export { 
  runAllTests, 
  testAuthentication, 
  testGetBranches, 
  testGetPrompt, 
  testValidateConfig, 
  clearAuthentication 
};
