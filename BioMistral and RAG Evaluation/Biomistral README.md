# BioMistral and RAG Evaluation – Heart Disease CDSS

## 1. Overview

This component retrieves relevant medical evidence from the Pinecone knowledge base and uses BioMistral 7B to generate medical answers. It also provides a FastAPI inference service connected to the CDSS backend through a temporary Cloudflare Tunnel. The evaluation section measures retrieval and answer quality using medical questions and reference answers.

## 2. Technologies and configuration

- Google Colab with GPU access, Python, PyTorch and Hugging Face Transformers
- BioMistral model: `BioMistral/BioMistral-7B`
- Model optimization: 4-bit NF4 quantization with double quantization
- Embedding model: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- Pinecone index: `heart-disease-knowledge`
- Namespace: default (empty string)
- LangChain for evidence retrieval; default Top-K: 5
- FastAPI, Uvicorn and Cloudflare Tunnel for API connectivity
- pandas and Matplotlib for evaluation and visualization

## 3. Submitted files

- BioMistral Google Colab notebook (`.ipynb`): model loading, retrieval, answer generation, testing, inference API and RAG evaluation.
- `rag_questions.csv`: completed evaluation questions and reference answers.
- `rag_raw_results.csv`: generated answers, retrieved evidence, generation status and response times.
- Completed `rag_manual_review.csv` (or the saved reviewed filename): manual scores, reviewer notes and citation checks.
- `rag_evaluation_summary.csv`: final calculated evaluation scores.
- `rag_evaluation_chart.png`: visualization of evaluation results.

The medical reference documents and knowledge base indexing notebook are provided separately in the RAG Knowledge Base folder.

## 4. Google Colab setup

1. Upload or open the provided BioMistral notebook in Google Colab.
2. Select Runtime > Change runtime type and choose an available GPU.
3. Run the dependency installation cell. Restart the runtime if required by the installation output.
4. Run the imports, GPU verification, model configuration and model loading cells.
5. In Colab Secrets (key icon), add `PINECONE_API_KEY` using a valid authorized Pinecone API key and enable notebook access.
6. Ensure that the configured index contains the medical knowledge base. If using a new Pinecone account, first create and populate an authorized index using the RAG Knowledge Base notebook and ensure the index name, namespace and embedding configuration match.
7. Execute the retrieval, evidence processing, prompt construction and answer generation cells in order.
8. Run the RAG tests to verify retrieval and response generation.

## 5. Inference API and web application integration

1. Execute the API authentication cell. Enter an existing shared API key or if using the updated key-generation cell, press Enter to generate a new key.
2. Execute the FastAPI inference service and local server cells. The Colab service runs on port 8001.
3. Install and start the Cloudflare Tunnel using the notebook cells.
4. Copy the generated HTTPS tunnel URL and the shared API key into the local backend `.env` file using the variable names in the supplied `.env.example`.
5. Run the external API and authentication tests. The authenticated health request should return HTTP 200 and the unauthenticated request should return HTTP 401.
6. Start the CDSS backend and frontend.

The Colab and backend shared API keys must match. Keep the Colab runtime and tunnel running while using medical question answering. If the tunnel URL changes, update the backend configuration and restart the backend.

## 6. RAG evaluation

The evaluation uses at least 20 verified medical questions and reference answers. It uses the reusable `answer_medical_question()` function, which retrieves up to five passages and selects the first three for the RAG prompt. 

The evaluation process includes:

1. Prepare and upload the completed `rag_questions.csv` file.
2. Execute the evaluation questions to generate `rag_raw_results.csv`.
3. Run the automatic citation checks to identify citation presence and valid citation numbers.
4. Generate and download `rag_manual_review.csv`.
5. Complete the manual evaluation using the scoring criteria.

Score |	Meaning
0 |	Unsatisfactory
1 | Partially satisfactory
2 |	Fully satisfactory

6. Upload the completed manual evaluation CSV to Colab.
7. Execute the final evaluation cells to calculate average scores and percentages of the maximum score (2).
8. Save the evaluation summary CSV and chart.

Manual evaluation criteria are retrieval relevance, faithfulness, answer correctness and clinical safety. Response time and citation validity are also recorded. 
Generated evaluation files are saved in `/content/rag_evaluation/` during the Colab session. Download them before the runtime ends. 


