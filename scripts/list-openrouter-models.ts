async function listModels() {
  const apiKey = "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";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    // Filter for Claude models
    const claudeModels = data.data.filter((model: any) =>
      model.id.includes('claude') || model.name.toLowerCase().includes('claude')
    );

    console.log("Available Claude models on OpenRouter:\n");
    claudeModels.forEach((model: any) => {
      console.log(`ID: ${model.id}`);
      console.log(`Name: ${model.name}`);
      console.log(`Context: ${model.context_length}`);
      console.log(`Pricing: $${model.pricing.prompt}/1M prompt, $${model.pricing.completion}/1M completion`);
      console.log('---');
    });

    // Also show GPT-4 models for comparison
    console.log("\n\nAvailable GPT-4 models:\n");
    const gpt4Models = data.data.filter((model: any) =>
      model.id.includes('gpt-4')
    ).slice(0, 5);

    gpt4Models.forEach((model: any) => {
      console.log(`ID: ${model.id}`);
      console.log(`Name: ${model.name}`);
      console.log('---');
    });

  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

listModels();
