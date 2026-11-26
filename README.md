# Heart Disease Clinical Decision Support System (CDSS)

## 1. Project Overview

The Heart Disease Clinical Decision Support System is a web-based application developed to support healthcare professionals in assessing heart disease risk. It combines XGBoost for prediction, SHAP for prediction explanations and retrieval-augmented generation (RAG) with BioMistral 7B for medical question answering using retrieved medical evidence.

## 2. Technologies Used

-   Frontend: Next.js and TypeScript
-   Backend: Python and FastAPI
-   Database: PostgreSQL 18; management: pgAdmin 4
-   Machine learning: XGBoost
-   Explainable AI: SHAP
-   Embeddings: sentence-transformers/all-MiniLM-L6-v2
-   Vector database: Pinecone
-   Knowledge retrieval: LangChain and RAG
-   Language model: BioMistral 7B
-   Inference environment: Google Colab, PyTorch and Hugging Face Transformers
-   API connectivity: Uvicorn and Cloudflare Tunnel
-   Development: PyCharm, Jupyter Notebook and Visual Studio Code


## 3. System Features

-   User authentication and role-based authorization
-   Administrator and doctor dashboards
-   User and patient management
-   Heart disease risk prediction and SHAP explanations
-   Medical knowledge retrieval and question answering
-   Patient assessment management and history


## 4. System Requirements

Python (the development environment used Python 3.12), Node.js and npm compatible with the frontend package configuration, PostgreSQL 18, pgAdmin 4, a Jupyter environment, Google Colab with GPU access, authorized Pinecone access and an internet connection are required. A suitable editor such as VS Code or PyCharm may be used.

## 5. Dataset

The Heart Failure Prediction Dataset is used for model training and evaluation. The dataset file is `heart.csv`. 

## 7. Machine Learning and SHAP

### 7.1 Files

-   `ML & SHAP.ipynb`: preprocessing, feature engineering, feature selection, XGBoost training, evaluation and SHAP explanations.
-   `data/heart.csv`: input dataset.
-   `requirements.txt`: shared Python dependencies.
-   `models/`: saved models and explanation outputs.

Saved model files:

-   `xgboost_model.pkl`
-   `preprocessor.pkl`
-   `feature_selector.pkl`
-   `selected_features.pkl`
-   `shap_explainer.pkl`

SHAP outputs:

-   `shap_values.npy`
-   `shap_global_explanation.png`
-   `shap_global_importance.png`
-   `shap_individual_explanation.png`
-   `shap_individual_contributions.csv`
-   `shap_combined_explanation.png`

### 7.2 Execution

Open the Machine Learning and SHAP folder in PyCharm or Jupyter, create a Python environment and install dependencies:

``` bash
python -m pip install -r requirements.txt
```

Select that environment as the notebook kernel. Ensure the dataset is at `data/heart.csv` relative to the working directory. Open the ML and SHAP notebook and execute its cells in order to reproduce the model and explanations. Review the generated results in the models directory.


## 8. RAG Knowledge Base

### 8.1 Files and development environment

-   `CDSS_RAG.ipynb`: RAG implementation.
-   `requirements.txt`: shared Python dependencies.
-   `.env.example`: environment configuration template.
-   `RAG/documents/`: medical reference PDFs used for the knowledge base, subject to redistribution permissions.

The ML, SHAP and RAG components were developed within the same PyCharm project using a shared Python environment but separate Jupyter notebooks. Therefore, the same requirements.txt is provided in both the Machine Learning and SHAP and RAG Knowledge Base folders. 

### 8.2 Configuration

  Setting                   Value
  ------------------------- ----------------------------------------
  Pinecone index            heart-disease-knowledge
  Embedding model           sentence-transformers/all-MiniLM-L6-v2
  Embedding dimensions      384
  Chunk size                1000
  Chunk overlap             150
  Default retrieval Top-K   5
  Namespace                 Default (empty string)

### 8.3 Execution

1.  Open the RAG Knowledge Base folder in PyCharm or Jupyter.
2.  Install dependencies using `python -m pip install -r requirements.txt` and select the corresponding kernel.
3.  Ensure the PDFs are available at `RAG/documents/` relative to the working directory.
4.  Create a local `.env` from `.env.example` and configure authorized Pinecone credentials.
5.  Open the notebook and verify the document paths, index and namespace.
6.  Execute the cells in order to load documents, extract text, split text into chunks, generate embeddings, connect to Pinecone and test retrieval.

Keep `ENABLE_INDEXING = False` when using the existing populated index. To rebuild the knowledge base, first create a separate authorized compatible Pinecone index, verify its configuration and enable indexing with `ENABLE_INDEXING = True`. Disable indexing again after completion. Ensure the index name, namespace and embedding model match the Colab configuration. 


## 9. PostgreSQL Database Configuration

### 9.1 Database details

-   Database: `heart_disease_cdss`
-   Application role: `cdss_app`
-   Host: `localhost` (adjust if required)
-   Port: `5432` (default; adjust if required)
-   Schema: `public`

Tables: `users` (user accounts), `user_sessions` (sessions), `patients` (patient information), and `patient_assessments` (assessment information).

### 9.2 Database setup files

`database/database_setup.sql` creates the database and application role. `database/database_schema.sql` contains the table definitions, relationships, sequences, indexes and constraints. The schema is supplied without existing records.

### 9.3 Create the database and role

Install PostgreSQL 18 and pgAdmin 4. Connect as a PostgreSQL administrator to the default `postgres` database. Open the setup SQL file in the Query Tool, replace the placeholder password with a secure local password and execute these statements individually (CREATE DATABASE must run outside a transaction):

``` sql
CREATE ROLE cdss_app WITH LOGIN PASSWORD 'REPLACE_WITH_YOUR_PASSWORD';
CREATE DATABASE heart_disease_cdss OWNER cdss_app;
GRANT CONNECT ON DATABASE heart_disease_cdss TO cdss_app;
```


Connect to `heart_disease_cdss` and execute:

``` sql
GRANT USAGE, CREATE ON SCHEMA public TO cdss_app;
```

### 9.4 Import the schema

Open a terminal in the web application directory (containing `database/`) and execute:

``` bash
psql -U postgres -d heart_disease_cdss -v ON_ERROR_STOP=1 -f database/database_schema.sql
```

Enter the PostgreSQL administrator password when requested. Use the PostgreSQL 18 psql executable; add its bin directory to PATH if necessary. The dump contains psql-specific commands, so use psql rather than pasting the entire dump into the Query Tool.

Refresh pgAdmin and verify the four tables under Databases \> heart_disease_cdss \> Schemas \> public \> Tables. The application role must exist before importing because the schema assigns ownership to cdss_app.



## 10. BioMistral and RAG Evaluation

### 10.1 Overview

This component retrieves relevant medical evidence from the Pinecone knowledge base and uses BioMistral 7B to generate medical answers. It also provides a FastAPI inference service connected to the CDSS backend through a temporary Cloudflare Tunnel. The evaluation section measures retrieval and answer quality using medical questions and reference answers.

### 10.2 Technologies and configuration

-   Google Colab with GPU access, Python, PyTorch and Hugging Face Transformers
-   BioMistral model: `BioMistral/BioMistral-7B`
-   Model optimization: 4-bit NF4 quantization with double quantization
-   Embedding model: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
-   Pinecone index: `heart-disease-knowledge`
-   Namespace: default (empty string)
-   LangChain for evidence retrieval; default Top-K: 5
-   FastAPI, Uvicorn and Cloudflare Tunnel for API connectivity
-   pandas and Matplotlib for evaluation and visualization

### 10.3 Submitted files

-   BioMistral Google Colab notebook (`.ipynb`): model loading, retrieval, answer generation, testing, inference API and RAG evaluation.
-   `rag_questions.csv`: completed evaluation questions and reference answers.
-   `rag_raw_results.csv`: generated answers, retrieved evidence, generation status and response times.
-   Completed `rag_manual_review.csv` (or the saved reviewed filename): manual scores, reviewer notes and citation checks.
-   `rag_evaluation_summary.csv`: final calculated evaluation scores.
-   `rag_evaluation_chart.png`: visualization of evaluation results.

The medical reference documents and knowledge base indexing notebook are provided separately in the RAG Knowledge Base folder.

### 10.4 Google Colab setup

1.  Upload or open the provided BioMistral notebook in Google Colab.
2.  Select Runtime \> Change runtime type and choose an available GPU.
3.  Run the dependency installation cell. Restart the runtime if required by the installation output.
4.  Run the imports, GPU verification, model configuration and model loading cells.
5.  In Colab Secrets (key icon), add `PINECONE_API_KEY` using a valid authorized Pinecone API key and enable notebook access.
6.  Ensure that the configured index contains the medical knowledge base. If using a new Pinecone account, first create and populate an authorized index using the RAG Knowledge Base notebook and ensure the index name, namespace and embedding configuration match.
7.  Execute the retrieval, evidence processing, prompt construction and answer generation cells in order.
8.  Run the RAG tests to verify retrieval and response generation.

### 10.5 Inference API and web application integration

1.  Execute the API authentication cell. Enter an existing shared API key or, if using the updated key-generation cell, press Enter to generate a new key.
2.  Execute the FastAPI inference service and local server cells. The Colab service runs on port 8001.
3.  Install and start the Cloudflare Tunnel using the notebook cells.
4.  Copy the generated HTTPS tunnel URL and the shared API key into the local backend `.env` file using the variable names in the supplied `.env.example`.
5.  Run the external API and authentication tests. The authenticated health request should return HTTP 200 and the unauthenticated request should return HTTP 401.
6.  Start the CDSS backend and frontend.

The Colab and backend shared API keys must match. Keep the Colab runtime and tunnel running while using medical question answering. If the tunnel URL changes, update the backend configuration and restart the backend.

### 10.6 RAG evaluation

The evaluation requires at least 20 medical questions and reference answers. It uses the reusable `answer_medical_question()` function, which retrieves up to five passages and selects the first three for the RAG prompt. 

The evaluation process includes:

1.  Prepare and upload the completed `rag_questions.csv` file.
2.  Execute the evaluation questions to generate `rag_raw_results.csv`.
3.  Run the automatic citation checks to identify citation presence and valid citation numbers.
4.  Generate and download `rag_manual_review.csv`.
5.  Complete the manual evaluation using the scoring criteria.

Score |	Meaning
0 |	Unsatisfactory
1 | Partially satisfactory
2 |	Fully satisfactory

6.  Upload the completed manual evaluation CSV to Colab.
7.  Execute the final evaluation cells to calculate average scores and percentages of the maximum score (2).
8.  Save the evaluation summary CSV and chart.

Generated evaluation files are saved in `/content/rag_evaluation/` during the Colab session.  


## 11. Web Application Structure

``` text
CDSS_Web_Application/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── schemas_assessment.py
│   │   └── schemas_patient.py
│   ├── ml_models/
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   ├── create_admin.py
│   ├── create_tables.py
│   ├── create_patients_table.py
│   ├── create_assessments_table.py
│   └── add_patient_id_to_assessments.py
├── frontend/
│   ├── app/
│   ├── public/
│   ├── .gitignore
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   ├── next-env.d.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
└── database/
    ├── database_setup.sql
    └── database_schema.sql
```

Connection testing scripts (`test_db_connection.py` and `test_biomistral_connection.py`) are retained in their supplied backend locations. The frontend app directory contains admin, assessments, chat, hooks, login, patients and prediction components. Keep all nested source files and the five saved model files in backend/ml_models.

## 12. Backend Configuration and Execution

### 12.1 Install dependencies

Open a terminal in the web application directory:

``` powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 12.2 Environment configuration

Create `backend/.env` using the supplied `.env.example`. Configure database name, username, password, host, port, authentication secrets and BioMistral API URL and shared key using the exact variable names in the template. The database password must match the cdss_app role password. The BioMistral key must match the key configured in Colab. Use the URL format required by the backend configuration.

### 12.3 Create an administrator and test connectivity

From the backend directory, after database setup and dependency installation, execute:

``` bash
python create_admin.py
```

Follow the script's account creation requirements. Configure secure local credentials. Run the database connection test before starting the application. If the test scripts are in backend/tests, run:

``` bash
python -m tests.test_db_connection
python -m tests.test_biomistral_connection
```

If the scripts are directly in backend, run `python test_db_connection.py` and `python test_biomistral_connection.py` instead. The BioMistral connection test requires the active Colab API and matching credentials.

### 12.4 Start the backend

``` bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URL: http://127.0.0.1:8000

Keep the terminal running.

## 13. Frontend Configuration and Execution

Open a separate terminal in the web application directory:

``` bash
cd frontend
npm ci
npm run dev
```

Open the URL shown in the terminal, normally http://localhost:3000. Keep the terminal running. 

## 14. Complete System Execution Order

1.  Install the required software and dependencies.
2.  Create the PostgreSQL role and database and import the schema.
3.  Configure the backend environment and create an administrator account.
4.  Ensure the saved ML and SHAP models are available.
5.  Obtain authorized access to the populated Pinecone index or rebuild it using the RAG notebook.
6.  Load BioMistral in Colab and configure Pinecone access.
7.  Configure or generate the shared API key and start the inference service and Cloudflare Tunnel.
8.  Update the backend environment with the current tunnel URL and matching shared key.
9.  Verify database and inference API connectivity.
10. Start the backend and frontend in separate terminals.
11. Open the application, log in and test the system using synthetic patient data.

Retraining the model and repeating the RAG evaluation are not required for normal web application execution.

## 15. System Workflow

The user logs in and receives access according to the assigned role. A doctor enters or selects patient information. The backend validates and preprocesses the data, XGBoost predicts heart disease risk and SHAP explains the contributing features. Assessment information is managed through the web application. Medical questions are sent to the Colab inference API, relevant evidence is retrieved from Pinecone and BioMistral generates a response with supporting source information.






