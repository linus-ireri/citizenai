import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

async function main() {
  // 1. Load the persisted vector store
  const embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-MiniLM-L6-v2"
  });
  const vectorStore = await HNSWLib.load("vector_store", embeddings);

  // 2. Define a user query 
  const query = "What is this chatbot about?";

  // 3. Retrieve the top 3 most relevant chunks
  const results = await vectorStore.similaritySearch(query, 3);

  // 4. Print the results
  console.log(`Top 3 results for query: "${query}"`);
  results.forEach((doc, i) => {
    console.log(`\nResult #${i + 1}:`);
    console.log(doc.pageContent);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 