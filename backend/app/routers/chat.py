from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict

from app.services.rag_service import RAGService


router = APIRouter(
    prefix="/api/chat",
    tags=["Medical RAG Chat"]
)

rag_service = RAGService()


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(
        min_length=5,
        max_length=1000,
        description="Medical question for BioMistral"
    )

    top_k: int = Field(
        default=5,
        ge=3,
        le=10,
        description="Number of Pinecone passages to retrieve"
    )


class ChatSource(BaseModel):
    rank: int
    title: str
    page: int | str | None = None
    url: str | None = None
    excerpt: str = ""
    summary: str | None = None


class ChatResponse(BaseModel):
    question: str
    answer: str
    status: str
    sources: list[ChatSource]


@router.post(
    "/ask",
    response_model=ChatResponse
)
async def ask_medical_question(request: ChatRequest):

    try:
        result = await rag_service.answer_question(
            question=request.question,
            top_k=request.top_k
        )

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        ) from error

    except Exception as error:
        print(
            f"[BioMistral Chat Error] "
            f"{type(error).__name__}: {error}",
            flush=True
        )

        raise HTTPException(
            status_code=503,
            detail="Medical question-answering service unavailable"
        ) from error