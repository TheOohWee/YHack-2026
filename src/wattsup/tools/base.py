from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

from wattsup.models import PollContext

T = TypeVar("T")


class ToolResult(BaseModel, Generic[T]):
    ok: bool
    data: T | None = None
    error: str | None = None


class AgentTool(ABC):
    """Tool-style surface compatible with Agent Zero–style orchestrators."""

    name: str
    description: str

    @abstractmethod
    def run(self, ctx: PollContext, settings: Any) -> ToolResult:
        raise NotImplementedError
