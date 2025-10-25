// ingest.js

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

// 1. PDFs in the docs folder
const pdfPaths = [
  // "./docs/CANONICAL_INTERVIEW (1).pdf",
  // "./docs/CHECK_IN__DOCUMENTATION (7).pdf",
  // "./docs/LinoE_Book_ (2).pdf",
  "./docs/creating_an_a_genertive_chatbox_chatbase.pdf",
  "./docs/linoInfo_on_chatbox (1).pdf",
  // "./docs/Email_Quotes_Agent.pdf",
  "./docs/lino_ai_co_pdf (2).pdf",
  "./docs/how_local_host_an_LLM.pdf",
  "./docs/myself_tech_journey.pdf"
];

// URLs to scrape
const urls = [
  "https://lino-ai-co.netlify.app"
];

async function main() {
  // 1. Load all PDFs
  const pdfDocs = [];
  for (const path of pdfPaths) {
    const loader = new PDFLoader(path);
    const docs = await loader.load();
    pdfDocs.push(...docs);
  }

  // 2. Load all URLs
  const urlDocs = [];
  for (const url of urls) {
    const loader = new CheerioWebBaseLoader(url);
    const docs = await loader.load();
    urlDocs.push(...docs);
  }

  // 3. Combine all docs
  const allDocs = [...pdfDocs, ...urlDocs];

  // 4. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const splitDocs = await splitter.splitDocuments(allDocs);

  // 5. Use local HuggingFace embedding model
  const embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-MiniLM-L6-v2"
  });

  // 6. Store in HNSWLib
  const vectorStore = await HNSWLib.fromDocuments(
    splitDocs,
    embeddings
  );

  // Persist the vector store to disk
  await vectorStore.save("vector_store");

  console.log("Ingestion complete!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});