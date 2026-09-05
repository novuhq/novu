"""Novu bridge client configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from novu_framework.agent import RegisteredAgent


@dataclass(frozen=True, slots=True)
class ClientOptions:
    secret_key: str | None = None
    api_url: str = "https://api.novu.co"
    strict_authentication: bool = True
    verbose: bool = False

    @classmethod
    def from_env(cls) -> ClientOptions:
        return cls(
            secret_key=os.environ.get("NOVU_SECRET_KEY"),
            api_url=os.environ.get("NOVU_API_URL", "https://api.novu.co"),
            strict_authentication=os.environ.get("NOVU_STRICT_AUTHENTICATION", "true").lower()
            != "false",
        )


@dataclass
class Client:
    options: ClientOptions = field(default_factory=ClientOptions.from_env)
    _agents: dict[str, RegisteredAgent] = field(default_factory=dict, init=False)

    @property
    def secret_key(self) -> str | None:
        return self.options.secret_key

    @property
    def api_url(self) -> str:
        return self.options.api_url

    @property
    def strict_authentication(self) -> bool:
        return self.options.strict_authentication

    def add_agents(self, agents: list[RegisteredAgent]) -> None:
        for registered in agents:
            self._agents[registered.id] = registered

    def get_agent(self, agent_id: str) -> RegisteredAgent | None:
        return self._agents.get(agent_id)

    def __repr__(self) -> str:
        agents = list(self._agents.keys())

        return f"Client(api_url={self.api_url!r}, agents={agents})"
