"""
Tool registry for Agent Zero–style hosts: each external integration is an `AgentTool`.
Wire these into your Agent Zero profile as Python callables or plugin entries.
"""

from wattsup.tools import (
    ComEd5MinTool,
    GridStatusFuelMixTool,
    HexRunTool,
    K2V2GatewayTool,
    PushNotificationTool,
)

TOOL_CLASSES = [
    ComEd5MinTool,
    GridStatusFuelMixTool,
    HexRunTool,
    K2V2GatewayTool,
    PushNotificationTool,
]

TOOL_REGISTRY = {cls().name: cls for cls in TOOL_CLASSES}
