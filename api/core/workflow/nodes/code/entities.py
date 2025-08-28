from typing import Literal, Optional

from pydantic import BaseModel

from core.helper.code_executor.code_executor import CodeLanguage
from core.workflow.entities.variable_entities import VariableSelector
from core.workflow.nodes.base import BaseNodeData


class CodeNodeData(BaseNodeData):
    """
    Code Node Data.
    """

    class Output(BaseModel):
        type: Literal["string", "number", "object", "array[string]", "array[number]", "array[object]"]
        children: Optional[dict[str, "CodeNodeData.Output"]] = None

    class Dependency(BaseModel):
        name: str
        version: str

    class StreamingConfig(BaseModel):
        """Streaming configuration for real-time logs"""
        enabled: bool = False
        buffer_timeout: int = 100  # milliseconds
        max_log_lines: int = 1000

    variables: list[VariableSelector]
    code_language: Literal[CodeLanguage.PYTHON3, CodeLanguage.JAVASCRIPT]
    code: str
    outputs: dict[str, Output]
    dependencies: Optional[list[Dependency]] = None
    # Streaming configuration
    streaming: Optional[StreamingConfig] = None
