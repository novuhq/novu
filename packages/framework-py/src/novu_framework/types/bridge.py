"""Bridge and agent protocol types."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Discriminator, Field, Tag

AgentEventName = Literal["onMessage", "onAction", "onReaction", "onResolve"]
HumanInteractionKind = Literal["ask", "approve", "choose", "tell"]


class AgentMessageAuthor(BaseModel):
    model_config = ConfigDict(extra="allow")

    userId: str
    fullName: str
    userName: str
    isBot: bool | Literal["unknown"]


class AgentAttachment(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    url: str | None = None
    name: str | None = None
    mimeType: str | None = None
    size: int | None = None


class AgentMessage(BaseModel):
    model_config = ConfigDict(extra="allow")

    text: str
    platformMessageId: str
    author: AgentMessageAuthor
    timestamp: str
    attachments: list[AgentAttachment] | None = None


class AgentConversation(BaseModel):
    model_config = ConfigDict(extra="allow")

    identifier: str
    status: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    messageCount: int
    createdAt: str
    lastActivityAt: str


class AgentSubscriber(BaseModel):
    model_config = ConfigDict(extra="allow")

    subscriberId: str
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None


class AgentAction(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    sourceMessageId: str | None = None
    value: str | None = None


class AgentReaction(BaseModel):
    model_config = ConfigDict(extra="allow")

    messageId: str
    emojiName: str
    action: Literal["add", "remove"] | None = None


class AgentHumanResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    requestId: str
    interactionId: str
    kind: HumanInteractionKind
    status: str
    expired: bool
    text: str | None = None
    optionId: str | None = None
    respondedBy: str | None = None
    respondedBySubscriberId: str | None = None


class AgentHistoryEntry(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    toolData: dict[str, Any] | None = None


class AgentBridgeRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    version: int
    timestamp: str
    deliveryId: str
    event: AgentEventName
    agentId: str
    replyUrl: str
    eventsUrl: str | None = None
    conversationId: str
    integrationIdentifier: str
    action: AgentAction | None = None
    reaction: AgentReaction | None = None
    message: AgentMessage | None = None
    conversation: AgentConversation
    subscriber: AgentSubscriber
    history: list[AgentHistoryEntry] = Field(default_factory=list)
    platform: str
    platformContext: dict[str, Any] = Field(default_factory=dict)
    humanResponse: AgentHumanResponse | None = None
    context: dict[str, Any] | None = None
    notification: dict[str, Any] | None = None


class AgentSignalHuman(BaseModel):
    type: Literal["human"] = "human"
    kind: HumanInteractionKind
    prompt: str
    requestId: str
    options: list[str] | None = None
    from_: str | None = Field(default=None, alias="from")
    ttlSeconds: int | None = None
    to: str | list[str] | None = None


class AgentSignalMetadataSet(BaseModel):
    type: Literal["metadata"] = "metadata"
    action: Literal["set"] = "set"
    key: str
    value: object


class AgentSignalMetadataDelete(BaseModel):
    type: Literal["metadata"] = "metadata"
    action: Literal["delete"] = "delete"
    key: str


class AgentSignalMetadataClear(BaseModel):
    type: Literal["metadata"] = "metadata"
    action: Literal["clear"] = "clear"


class AgentSignalTrigger(BaseModel):
    type: Literal["trigger"] = "trigger"
    workflowId: str
    to: str | dict[str, str] | None = None
    payload: dict[str, Any] | None = None


AgentSignalMetadata = Annotated[
    Annotated[AgentSignalMetadataSet, Tag("set")]
    | Annotated[AgentSignalMetadataDelete, Tag("delete")]
    | Annotated[AgentSignalMetadataClear, Tag("clear")],
    Discriminator("action"),
]

AgentSignal = Annotated[
    Annotated[AgentSignalHuman, Tag("human")]
    | Annotated[AgentSignalMetadata, Tag("metadata")]
    | Annotated[AgentSignalTrigger, Tag("trigger")],
    Discriminator("type"),
]

AGENT_EVENT_PROTOCOL_VERSION = 1
