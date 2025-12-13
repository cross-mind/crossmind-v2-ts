import { getProjectFramework } from "../lib/db/queries";

async function test() {
  try {
    console.log("Testing getProjectFramework...");
    const result = await getProjectFramework("cfdd5092-ab38-4612-a1c2-4d3342ee0444");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

test();
