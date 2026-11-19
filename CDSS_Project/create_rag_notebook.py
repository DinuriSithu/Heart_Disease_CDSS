
from pathlib import Path
import nbformat as nbf

notebook = nbf.v4.new_notebook()
cells = []

def topic(title, description=""):
    cells.append(
        nbf.v4.new_markdown_cell(
            f"## {title}\n\n{description}"
        )
    )

def code(source):
    cells.append(nbf.v4.new_code_cell(source))


# TOPIC 1
topic(
    "1. Environment Setup",
    "Install the dependencies in the active Jupyter kernel. "
    "Run this cell only when setting up the environment."
)

code("""
%pip install -U pypdf python-dotenv sentence-transformers pinecone langchain-core langchain-community langchain-text-splitters langchain-pinecone langchain-huggingface
""")


# TOPIC 2
topic(
    "2. Imports and Configuration",
    "Configure project paths, the embedding model, "
    "and Pinecone index settings."
)

code("""
import os
import hashlib
from pathlib import Path

from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore

PROJECT_DIR = Path.cwd()
DOCUMENTS_DIR = PROJECT_DIR / "RAG" / "documents"

load_dotenv(PROJECT_DIR / ".env")

INDEX_NAME = "heart-disease-knowledge"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150
TOP_K = 5

# Set this to the namespace used by your existing index.
# The empty string represents Pinecone's default namespace.
NAMESPACE = ""

print("Project directory:", PROJECT_DIR)
print("Documents directory:", DOCUMENTS_DIR)
print("Pinecone index:", INDEX_NAME)
""")


# TOPIC 3
topic(
    "3. Medical Document Discovery",
    "Locate the medical PDF documents without modifying them."
)

code("""
if not DOCUMENTS_DIR.is_dir():
    raise FileNotFoundError(
        f"Documents directory not found: {DOCUMENTS_DIR}"
    )

pdf_files = sorted(DOCUMENTS_DIR.glob("*.pdf"))

print("Number of PDF files:", len(pdf_files))

for pdf_file in pdf_files:
    print(pdf_file.name)

if not pdf_files:
    raise ValueError("No PDF documents were found.")
""")


# TOPIC 4
topic(
    "4. PDF Text Extraction",
    "Use LangChain's PyPDFLoader to extract individual pages "
    "while preserving source information."
)

code("""
documents = []
failed_files = []

for pdf_file in pdf_files:
    try:
        loader = PyPDFLoader(str(pdf_file))
        pages = loader.load()

        for page in pages:
            page.metadata["source"] = pdf_file.name
            page.metadata["page"] = (
                int(page.metadata.get("page", 0)) + 1
            )

            if page.page_content.strip():
                documents.append(page)

        print(
            f"Loaded {pdf_file.name}: "
            f"{len(pages)} pages"
        )

    except Exception as error:
        failed_files.append((pdf_file.name, str(error)))
        print(f"FAILED: {pdf_file.name}: {error}")

print("Extracted nonempty pages:", len(documents))
print("Failed files:", len(failed_files))

if not documents:
    raise ValueError("No usable PDF text was extracted.")
""")


# TOPIC 5
topic(
    "5. Text Preprocessing and Chunking",
    "Split extracted medical text into overlapping chunks."
)

code("""
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    length_function=len,
    add_start_index=True
)

chunks = text_splitter.split_documents(documents)

chunks = [
    chunk for chunk in chunks
    if chunk.page_content.strip()
]

print("Total chunks:", len(chunks))

if chunks:
    print("Source:", chunks[0].metadata["source"])
    print("Page:", chunks[0].metadata["page"])
    print("Preview:", chunks[0].page_content[:500])
""")


# TOPIC 6
topic(
    "6. Embedding Model",
    "Load the same 384-dimensional embedding model used "
    "by the original Pinecone implementation."
)

code("""
embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL,
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True}
)

test_embedding = embeddings.embed_query(
    "High blood pressure is a risk factor for heart disease."
)

print("Embedding dimensions:", len(test_embedding))

assert len(test_embedding) == 384
""")


# TOPIC 7
topic(
    "7. Pinecone Connection",
    "Connect to the existing Pinecone account and index."
)

code("""
api_key = os.getenv("PINECONE_API_KEY")

if not api_key:
    raise ValueError(
        "PINECONE_API_KEY is missing from .env"
    )

pc = Pinecone(api_key=api_key)

if not pc.has_index(INDEX_NAME):
    raise ValueError(
        f"Index '{INDEX_NAME}' does not exist. "
        "Verify the Pinecone account and index name."
    )

index = pc.Index(INDEX_NAME)

stats = index.describe_index_stats()

print("Connected index:", INDEX_NAME)
print("Index dimensions:", stats.dimension)
print("Total vectors:", stats.total_vector_count)

assert stats.dimension == 384, (
    "Pinecone dimension does not match the embedding model."
)
""")


# TOPIC 8
topic(
    "8. LangChain Pinecone Vector Store",
    "Connect LangChain to the existing vector index."
)

code("""
vector_store = PineconeVectorStore(
    index=index,
    embedding=embeddings,
    text_key="text",
    namespace=NAMESPACE
)

print("LangChain Pinecone vector store initialized.")
""")


# TOPIC 9
topic(
    "9. Optional Document Indexing",
    "Only run the upload cell when deliberately indexing "
    "new or updated documents. The existing index may "
    "already contain your medical knowledge."
)

code("""
def generate_chunk_id(document):
    content = (
        f"{document.metadata.get('source', '')}|"
        f"{document.metadata.get('page', '')}|"
        f"{document.metadata.get('start_index', '')}|"
        f"{document.page_content}"
    )

    return hashlib.sha256(
        content.encode("utf-8")
    ).hexdigest()


chunk_ids = [
    generate_chunk_id(chunk)
    for chunk in chunks
]

print("Chunks prepared:", len(chunk_ids))
print("Unique IDs:", len(set(chunk_ids)))

assert len(chunk_ids) == len(set(chunk_ids))
""")

code("""
# SAFETY SWITCH
# Leave False when testing your existing Pinecone index.
# Set True only when you intentionally want to upload.

ENABLE_INDEXING = False

if ENABLE_INDEXING:
    if failed_files:
        raise RuntimeError(
            "Resolve PDF loading failures before indexing."
        )

    batch_size = 32

    for start in range(0, len(chunks), batch_size):
        batch = chunks[start:start + batch_size]
        ids = chunk_ids[start:start + batch_size]

        vector_store.add_documents(
            documents=batch,
            ids=ids
        )

        print(
            f"Indexed {min(start + batch_size, len(chunks))}"
            f"/{len(chunks)}"
        )

    print("Document indexing completed.")
else:
    print("Indexing skipped. Existing vectors preserved.")
""")


# TOPIC 10
topic(
    "10. LangChain Medical Evidence Retrieval",
    "Use the LangChain retriever interface to search Pinecone."
)

code("""
retriever = vector_store.as_retriever(
    search_type="similarity",
    search_kwargs={"k": TOP_K}
)


def retrieve_medical_evidence(question):
    if not isinstance(question, str) or not question.strip():
        raise ValueError("A nonempty question is required.")

    retrieved_documents = retriever.invoke(question)

    evidence = []

    for rank, document in enumerate(
        retrieved_documents, start=1
    ):
        evidence.append({
            "rank": rank,
            "source": document.metadata.get(
                "source", "Unknown"
            ),
            "page": document.metadata.get("page"),
            "text": document.page_content
        })

    return evidence


print("LangChain retriever initialized.")
""")


# TOPIC 11
topic(
    "11. Retrieval Testing",
    "Test medical evidence retrieval and inspect source references."
)

code("""
question = (
    "What are the common risk factors for heart disease?"
)

results = retrieve_medical_evidence(question)

print("Question:", question)
print("Retrieved passages:", len(results))

for result in results:
    print("-" * 70)
    print("Rank:", result["rank"])
    print("Source:", result["source"])
    print("Page:", result["page"])
    print("Text:", result["text"][:700])
""")


# TOPIC 12
topic(
    "12. BioMistral Integration Preparation",
    "Prepare retrieved evidence as a structured text context. "
    "This section does not call BioMistral."
)

code("""
def format_evidence_context(evidence):
    sections = []

    for item in evidence:
        sections.append(
            f"Source: {item['source']}\\n"
            f"Page: {item['page']}\\n"
            f"Evidence:\\n{item['text']}"
        )

    return "\\n\\n---\\n\\n".join(sections)


medical_context = format_evidence_context(results)

print("Context length:", len(medical_context))
print("Context preview:")
print(medical_context[:1500])
""")


topic(
    "13. Development Notes",
    """
### Current implementation

- LangChain handles document loading, splitting and retrieval.
- Pinecone remains the vector database.
- The existing MiniLM embedding model is retained.
- PDF source and page metadata are preserved.
- BioMistral integration is intentionally deferred.

### Important limitations

1. This notebook does not validate the clinical correctness of the source documents.
2. The original document metadata catalog needs to be matched to actual PDF filenames.
3. LangChain chunking may differ from the original manual chunking implementation.
4. Reindexing requires a deliberate migration strategy to prevent stale vectors.
5. Retrieved passages must be evaluated before use in clinical decision support.
6. Medical retrieval results are supporting evidence, not clinical diagnoses.
"""
)


notebook.cells = cells
notebook.metadata = {
    "kernelspec": {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3"
    },
    "language_info": {
        "name": "python"
    }
}

output_path = Path("CDSS_RAG.ipynb")

if output_path.exists():
    raise FileExistsError(
        "CDSS_RAG.ipynb already exists. "
        "Back it up or rename it before generating the new notebook."
    )

nbf.write(notebook, output_path)

print("Notebook created:", output_path.resolve())
print("Total cells:", len(notebook.cells))
