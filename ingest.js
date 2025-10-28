// ingest.js

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import fs from "fs";
import path from "path";

// PDF paths
const pdfPaths = [
  "./docs/ComputerMisuseandCybercrimesActNo5of2018.pdf",
  "./docs/THE COMPUTER MISUSE AND CYBERCRIME (AMENDMENT) BILL,2024.pdf",
  "./docs/Privatization Act (1) 2025.pdf",
  "./docs/The Privatisation Bill, 2023.pdf"
];

// URLs to scrape
const urls = [
  "https://www.kra.go.ke/en/helping-taxpayers/faqs"
];

const VECTOR_STORE_PATH = "./vector_store";

async function loadPDFs() {
  console.log("📄 Loading PDFs...");
  const docs = [];
  
  for (const pdfPath of pdfPaths) {
    try {
      if (!fs.existsSync(pdfPath)) {
        console.warn(`⚠️  Skipping missing file: ${pdfPath}`);
        continue;
      }
      
      console.log(`  Loading: ${path.basename(pdfPath)}`);
      const loader = new PDFLoader(pdfPath);
      const pdfDocs = await loader.load();
      docs.push(...pdfDocs);
      console.log(`  ✓ Loaded ${pdfDocs.length} pages`);
    } catch (error) {
      console.error(`  ✗ Error loading ${pdfPath}:`, error.message);
    }
  }
  
  return docs;
}

async function loadURLs() {
  console.log("\n🌐 Loading URLs...");
  const docs = [];
  
  for (const url of urls) {
    try {
      console.log(`  Scraping: ${url}`);
      const loader = new CheerioWebBaseLoader(url);
      const urlDocs = await loader.load();
      docs.push(...urlDocs);
      console.log(`  ✓ Loaded ${urlDocs.length} documents`);
    } catch (error) {
      console.error(`  ✗ Error loading ${url}:`, error.message);
    }
  }
  
  return docs;
}

async function main() {
  console.log("🚀 Starting RAG ingestion pipeline...\n");
  
  // 1. Load documents
  const pdfDocs = await loadPDFs();
  const urlDocs = await loadURLs();
  const allDocs = [...pdfDocs, ...urlDocs];
  
  if (allDocs.length === 0) {
    console.error("❌ No documents loaded. Exiting.");
    process.exit(1);
  }
  
  console.log(`\n📊 Total documents loaded: ${allDocs.length}`);
  
  // 2. Split into chunks
  console.log("\n✂️  Splitting documents into chunks...");
  const splitter = new RecursiveCharacterTextSplitter({ 
    chunkSize: 1000, 
    chunkOverlap: 200 
  });
  const splitDocs = await splitter.splitDocuments(allDocs);
  console.log(`  ✓ Created ${splitDocs.length} chunks`);
  
  // 3. Initialize embeddings model
  console.log("\n🤖 Loading embedding model (this may take a moment)...");
  const embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-MiniLM-L6-v2"
  });
  console.log("  ✓ Embedding model loaded");
  
  // 4. Create vector store
  console.log("\n🔢 Creating embeddings and building vector store...");
  console.log("  (This will take several minutes for large documents)");
  
  const vectorStore = await HNSWLib.fromDocuments(
    splitDocs,
    embeddings
  );
  
  // 5. Save to disk
  console.log("\n💾 Saving vector store to disk...");
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(VECTOR_STORE_PATH)) {
    fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
  }
  
  await vectorStore.save(VECTOR_STORE_PATH);
  console.log(`  ✓ Vector store saved to: ${VECTOR_STORE_PATH}`);
  
  // 6. Print summary
  console.log("\n✅ Ingestion complete!");
  console.log("\n📈 Summary:");
  console.log(`  - PDFs processed: ${pdfPaths.length}`);
  console.log(`  - URLs scraped: ${urls.length}`);
  console.log(`  - Total chunks: ${splitDocs.length}`);
  console.log(`  - Vector store location: ${VECTOR_STORE_PATH}`);
}

main().catch(err => {
  console.error("\n❌ Ingestion failed:");
  console.error(err);
  process.exit(1);
});