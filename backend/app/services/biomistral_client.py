import os
import httpx
from dotenv import load_dotenv

load_dotenv()


class BioMistralClient:

    def __init__(self):
        self.api_url = os.getenv("BIOMISTRAL_API_URL", "").rstrip("/")
        self.api_key = os.getenv("BIOMISTRAL_API_KEY", "")

    async def generate_answer(self, question: str, top_k: int = 5):

        if not self.api_url or not self.api_key:
            raise RuntimeError(
                "BioMistral API URL or API key is missing."
            )

        if not (
            self.api_url.startswith("https://")
            and self.api_url.endswith(".trycloudflare.com")
        ):
            raise RuntimeError("Invalid BioMistral tunnel URL.")

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=15.0,
                read=180.0,
                write=15.0,
                pool=15.0,
            ),
            follow_redirects=False,
            trust_env=False,
        ) as client:

            response = await client.post(
                f"{self.api_url}/infer",
                headers={
                    "Authorization": f"Bearer {self.api_key}"
                },
                json={
                    "question": question,
                    "top_k": top_k,
                },
            )

            response.raise_for_status()

            return response.json()
            