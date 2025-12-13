async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY || "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";

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY not found");
    process.exit(1);
  }

  console.log("Testing OpenRouter API...");
  console.log("API Key:", apiKey.substring(0, 20) + "...");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://crossmind.app",
        "X-Title": "CrossMind Test",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
        messages: [{ role: "user", content: "Hello, this is a test. Reply with 'OK'" }],
        max_tokens: 50,
      }),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("API Error:", data);
      process.exit(1);
    }

    console.log("\n✅ OpenRouter API is working!");
    console.log("Model response:", data.choices?.[0]?.message?.content);
  } catch (error) {
    console.error("❌ Error testing OpenRouter:", error);
    process.exit(1);
  }
}

testOpenRouter();
