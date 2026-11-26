from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class SourceSegment(BaseModel):
    id: str = Field(default="source-1")
    trust: str = Field(default="untrusted", description="'user', 'trusted', or 'untrusted'")
    text: str

class ArgGuardClient:
    """
    Client helper to wrap MCP tool calls with source segments for ArgGuard grounding verification.
    """
    def __init__(self, default_trust: str = "untrusted"):
        self.default_trust = default_trust

    def wrap_tool_call(
        self,
        request_id: Any,
        tool_name: str,
        arguments: Dict[str, Any],
        sources: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        formatted_sources = []
        for idx, s in enumerate(sources):
            formatted_sources.append({
                "id": s.get("id", f"src-{idx+1}"),
                "trust": s.get("trust", self.default_trust),
                "text": s.get("text", "")
            })

        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
                "_meta": {
                    "argguard": {
                        "sources": formatted_sources
                    }
                }
            }
        }

def langchain_tool_callback(tool_name: str, args: Dict[str, Any], source_documents: List[str]) -> Dict[str, Any]:
    """
    Helper adapter for LangChain / LangGraph tool invocation.
    Appends source context into tool metadata.
    """
    client = ArgGuardClient()
    sources = [{"id": f"doc-{i}", "trust": "untrusted", "text": doc} for i, doc in enumerate(source_documents)]
    return client.wrap_tool_call(
        request_id=1,
        tool_name=tool_name,
        arguments=args,
        sources=sources
    )
