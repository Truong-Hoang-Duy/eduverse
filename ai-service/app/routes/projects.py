from fastapi import APIRouter

from app import prompts
from app.llm import generate_json
from app.schemas import (
    SuggestCodeSnippetRequest,
    SuggestCodeSnippetResponse,
    SuggestFeaturesRequest,
    SuggestFeaturesResponse,
)

router = APIRouter()


@router.post("/suggest-features", response_model=SuggestFeaturesResponse)
def suggest_features(body: SuggestFeaturesRequest) -> SuggestFeaturesResponse:
    prompt = prompts.build_suggest_features_prompt(
        project_name=body.project_name,
        description=body.description,
        existing_features=body.existing_features,
        course_code=body.course_code,
        desired_difficulty=body.desired_difficulty,
    )
    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {
                "suggestions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "difficulty": {
                                "type": "string",
                                "enum": ["easy", "medium", "hard"],
                            },
                        },
                        "required": ["name", "description", "difficulty"],
                    },
                }
            },
            "required": ["suggestions"],
        },
        api_key=body.api_key,
        provider=body.provider,
    )
    return SuggestFeaturesResponse(**data)


@router.post("/suggest-code-snippet", response_model=SuggestCodeSnippetResponse)
def suggest_code_snippet(
    body: SuggestCodeSnippetRequest,
) -> SuggestCodeSnippetResponse:
    prompt = prompts.build_suggest_code_snippet_prompt(
        code=body.code,
        teacher_hint=body.teacher_hint,
    )
    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "usage_guide": {"type": "string"},
                "category": {
                    "type": "string",
                    "enum": [
                        "scratch",
                        "gamemaker",
                        "app",
                        "web",
                        "cs",
                    ],
                },
            },
            "required": ["title", "category"],
        },
        api_key=body.api_key,
        provider=body.provider,
    )
    return SuggestCodeSnippetResponse(**data)

