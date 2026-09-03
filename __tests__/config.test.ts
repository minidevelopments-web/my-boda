import { getSiteConfig } from "@/lib/config";

// Mock environment variables
const originalEnv = process.env.NEXT_PUBLIC_ACCOMMODATIONS_JSON;

describe("config.ts safety checks", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ACCOMMODATIONS_JSON = "[{\"name\":\"Safe\",\"url\":\"https://example.com\"}, {\"name\":\"Unsafe\",\"url\":\"javascript:alert(1)\"}]";
    // Restore original function if necessary, but for this test we can rely on the updated file
  });

  test("should filter out unsafe URLs in accommodations", () => {
    // Assuming we are testing the logic inside getSiteConfig
    // We need to ensure isSafeUrl is defined or imported correctly for this unit test context
    
    // Mock the external function call for isolation if needed, but here we test the file logic.
    // For simplicity, we will assume getSiteConfig runs correctly and test the output structure/content.
    
    // Since we can't easily isolate the filter function without mocking the whole module,
    // we will test the integration point by checking the resulting object structure if possible,
    // or by re-running the logic in isolation if the skill output implies it.
    
    // For the purpose of this task, we will assume the test environment allows us to check the resulting array
    // and that the fix is applied correctly in getSiteConfig.
    
    // Mocking the environment variables is enough to trigger the logic in the real file.
    
    // NOTE: Since the skill provided a general test template, I am writing a specific test for the fix.
    // I will test the *result* of the logic.
    
    const config = getSiteConfig();

    expect(config.accommodations).toHaveLength(1);
    expect(config.accommodations[0].name).toBe("Safe");
  });
});
