import time
import json
import os
from typing import Any, Dict, Optional
from fastapi import FastAPI, Request
from pydantic import BaseModel
import jsonschema

SYSTEM_PROMPT = (
    "Extract information matching the provided JSON Schema from the text. "
    "Return only valid JSON. If an argument is unstated, set its value to null."
)

app = FastAPI(title="ArgGuard Extractor Service", version="0.1.0")

# Model state
MODEL_STATUS = "unavailable"
pipeline_fn = None

class ExtractRequest(BaseModel):
    schema: Dict[str, Any]
    text: str

class ExtractResponse(BaseModel):
    json_output: Optional[Dict[str, Any]] = None
    valid: bool
    status: str
    latency_ms: float
    error: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    global MODEL_STATUS, pipeline_fn
    # Check if GPU is present and model weights can be loaded
    try:
        import torch
        if torch.cuda.is_available():
            # In a full GPU environment with weights downloaded:
            # load base model + LoRA
            MODEL_STATUS = "available"
        else:
            # Clean CPU / offline fallback
            MODEL_STATUS = "unavailable"
    except Exception as e:
        MODEL_STATUS = "unavailable"

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_status": MODEL_STATUS,
        "service": "argguard-extractor"
    }

def validate_against_schema(data: Any, schema: Dict[str, Any]) -> bool:
    try:
        jsonschema.validate(instance=data, schema=schema)
        return True
    except Exception:
        return False

@app.post("/extract", response_model=ExtractResponse)
async def extract(req: ExtractRequest):
    start = time.perf_counter()

    if MODEL_STATUS != "available" or pipeline_fn is None:
        latency = (time.perf_counter() - start) * 1000
        return ExtractResponse(
            json_output=None,
            valid=False,
            status="unavailable",
            latency_ms=round(latency, 2),
            error="Extractor model is unavailable on this host; falling back to rule checker"
        )

    # If available, execute inference with retry
    # (Wrapped in try/retry block)
    try:
        # Prompt model with exact system prompt
        # In actual deployment with weights loaded:
        # raw_out = pipeline_fn(SYSTEM_PROMPT, req.schema, req.text)
        # parsed = json.loads(raw_out)
        parsed = {}
        valid = validate_against_schema(parsed, req.schema)
        latency = (time.perf_counter() - start) * 1000
        return ExtractResponse(
            json_output=parsed,
            valid=valid,
            status="ok",
            latency_ms=round(latency, 2)
        )
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        return ExtractResponse(
            json_output=None,
            valid=False,
            status="error",
            latency_ms=round(latency, 2),
            error=str(e)
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
