from typing import Any, Dict, List, Callable
from argguard_sdk import ArgGuardClient

class CrewAIMiddleware:
    """
    CrewAI / LlamaIndex middleware ensuring tool calls carry source provenance.
    """
    def __init__(self, argguard_client: ArgGuardClient = None):
        self.client = argguard_client or ArgGuardClient()

    def before_tool_execution(self, tool_name: str, tool_args: Dict[str, Any], context_docs: List[str]) -> Dict[str, Any]:
        """
        Intercepts tool call, attaches context sources, and returns formatted MCP tool call.
        """
        sources = [{"id": f"crew-ctx-{i+1}", "trust": "untrusted", "text": doc} for i, doc in enumerate(context_docs)]
        return self.client.wrap_tool_call(
            request_id=1,
            tool_name=tool_name,
            arguments=tool_args,
            sources=sources
        )

class LlamaIndexMiddleware:
    """
    LlamaIndex query engine tool interceptor.
    """
    def __init__(self):
        self.middleware = CrewAIMiddleware()

    def wrap_query_tool(self, tool_name: str, arguments: Dict[str, Any], source_nodes: List[Any]) -> Dict[str, Any]:
        text_sources = []
        for n in source_nodes:
            text_sources.append(getattr(n, "text", str(n)))
        return self.middleware.before_tool_execution(tool_name, arguments, text_sources)
