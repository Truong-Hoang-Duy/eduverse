from fastapi import APIRouter

from app import prompts
from app.gemini import generate_json
from app.schemas import SuggestFeaturesRequest, SuggestFeaturesResponse

router = APIRouter()


@router.post("/suggest-features", response_model=SuggestFeaturesResponse)
def suggest_features(body: SuggestFeaturesRequest) -> SuggestFeaturesResponse:
    prompt = prompts.build_suggest_features_prompt(
        project_name=body.project_name,
        description=body.description,
        existing_features=body.existing_features,
        course_code=body.course_code,
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
    )
    return SuggestFeaturesResponse(**data)
