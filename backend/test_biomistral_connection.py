import asyncio

from app.services.biomistral_client import BioMistralClient


async def main():
    client = BioMistralClient()

    print("Testing BioMistral connection...")

    try:
        result = await client.generate_answer(
            question="What are the common risk factors for heart disease?",
            top_k=5,
        )

        print("\nConnection successful!")
        print("Status:", result.get("status"))
        print("Answer:", result.get("answer"))

        sources = result.get("sources", [])
        print("Number of sources:", len(sources))

        for source in sources:
            print(
                "-",
                source.get("title"),
                "| Page:",
                source.get("page"),
            )

    except Exception as error:
        print("\nConnection failed!")
        print("Error type:", type(error).__name__)

        # Avoid printing exception details that might expose
        # the private tunnel URL or authentication information.


if __name__ == "__main__":
    asyncio.run(main())