# RAG Knowledge Base – Heart Disease CDSS

## 1. Overview

The Retrieval-Augmented Generation (RAG) knowledge base was developed to provide relevant medical information for the Heart Disease Clinical Decision Support System.

Medical reference documents are processed, divided into smaller text chunks, converted into vector embeddings and stored in the Pinecone vector database. The stored embeddings are used to retrieve relevant medical evidence based on medical questions.

The retrieved evidence is supplied to BioMistral 7B to generate medical responses.

## 2. Technologies Used

- Python
- Jupyter Notebook
- PyCharm
- LangChain
- Pinecone
- Sentence Transformers
- Hugging Face
- all-MiniLM-L6-v2 embedding model

## 3. Files and Folders

- `CDSS_RAG.ipynb`
- `requirements.txt` – Python libraries and dependencies used during development.
- `.env.example` – Environment configuration template for Pinecone connectivity.
- `RAG/documents/` – Medical reference documents used to develop the knowledge base.



## 4. Development Environment and Dependencies

The Machine Learning, SHAP and RAG knowledge base components were developed within the same PyCharm project using a shared Python virtual environment. However, the implementations were developed in separate Jupyter Notebook files.

Therefore, the same `requirements.txt` file is provided in both the Machine Learning and SHAP folder and the RAG Knowledge Base folder.

The requirements file contains the combined Python dependencies used during the development of these components.

## 5. Knowledge Base Configuration

- Vector database: Pinecone
- Index name: `heart-disease-knowledge`
- Embedding model: `sentence-transformers/all-MiniLM-L6-v2`
- Embedding dimensions: 384
- Chunk size: 1000
- Chunk overlap: 150
- Default retrieval Top-K: 5

## 6. RAG Knowledge Base Workflow

1. Load the medical reference documents.
2. Extract text from the documents.
3. Process the extracted medical information.
4. Divide the text into smaller chunks.
5. Generate vector embeddings using the embedding model.
6. Connect to the Pinecone vector database.
7. Store the embeddings and associated document metadata.
8. Retrieve relevant medical evidence based on a medical question.
9. Verify the retrieved documents and source information.

## 7. Installation and Execution

1. Open the RAG Knowledge Base folder in PyCharm or another suitable Jupyter Notebook environment.
2. Configure a Python virtual environment.
3. Install the required dependencies using:

```bash
python -m pip install -r requirements.txt
```

4. Ensure that the medical reference documents are available inside the `RAG/documents` folder.
5. Create a local `.env` file using the provided `.env.example` file.
6. Configure a valid Pinecone API key.
7. Open the updated RAG implementation notebook.
8. Verify the document paths and Pinecone configuration.
9. Execute the notebook cells in order.
10. Verify the indexing and retrieval results.

## 8. Document Indexing

The Pinecone index and namespace must match the configuration used in the BioMistral Google Colab notebook.

## 9. Integration with BioMistral

The RAG knowledge base is connected to BioMistral 7B through the Google Colab implementation.

When a medical question is submitted, relevant medical evidence is retrieved from Pinecone and supplied to BioMistral to generate a response.
