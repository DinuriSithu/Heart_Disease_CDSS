from app.services.biomistral_client import BioMistralClient


class RAGService:
    """
    Coordinates medical question answering using
    BioMistral and Pinecone through the Colab API.
    """

    def __init__(self):
        self.biomistral_client = BioMistralClient()

    async def answer_question(
        self,
        question: str,
        top_k: int = 5
    ) -> dict:

        # Validate the incoming question
        question = question.strip()

        if len(question) < 5:
            raise ValueError(
                "Medical question must contain at least 5 characters."
            )

        if not 3 <= top_k <= 10:
            raise ValueError(
                "top_k must be between 3 and 10."
            )

        # Send the question to BioMistral in Google Colab
        result = await self.biomistral_client.generate_answer(
            question=question,
            top_k=top_k
        )

        # Validate the returned response
        if not isinstance(result, dict):
            raise RuntimeError(
                "Invalid BioMistral API response."
            )

        if result.get("status") != "generated":
            raise RuntimeError(
                "BioMistral did not generate an answer."
            )

        answer = result.get("answer")

        if not isinstance(answer, str) or not answer.strip():
            raise RuntimeError(
                "BioMistral returned an empty answer."
            )

        sources = result.get("sources", [])

        if not isinstance(sources, list):
            raise RuntimeError(
                "BioMistral returned invalid sources."
            )

        return {
            "question": question,
            "answer": answer,
            "status": result["status"],
            "sources": sources
        }