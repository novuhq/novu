"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { APPROVAL_OPTIONS } from "@/lib/approval-options";
import { ApprovalCard, type ApprovalState } from "./approval-card";

function commandPreview(args: unknown, argsText: string | undefined, toolName: string): string {
  if (argsText?.trim()) return argsText.trim();
  if (args && typeof args === "object" && Object.keys(args as object).length > 0) {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return toolName;
    }
  }
  return toolName;
}

function approvalState(
  approved: boolean | undefined,
  resolution: "cancelled" | "expired" | undefined,
): ApprovalState {
  if (resolution === "cancelled" || resolution === "expired" || approved === false) {
    return "denied";
  }
  if (approved === undefined) return "request";
  return "done";
}

export const NovuApprovalCard: ToolCallMessagePartComponent = ({
  toolName,
  args,
  argsText,
  approval,
  respondToApproval,
}) => {
  const options = approval?.options ?? [];
  const once = options.find((option) => option.id === APPROVAL_OPTIONS.approved.id);
  const alwaysTool = options.find((option) => option.id === APPROVAL_OPTIONS["trust-tool"].id);
  const alwaysServer = options.find((option) => option.id === APPROVAL_OPTIONS["trust-server"].id);
  const deny = options.find((option) => option.id === APPROVAL_OPTIONS.denied.id);

  const respond = (optionId: string, approved: boolean) => {
    respondToApproval?.({ optionId, approved });
  };

  return (
    <ApprovalCard
      state={approvalState(approval?.approved, approval?.resolution)}
      command={commandPreview(args, argsText, toolName)}
      title={toolName}
      subtitle="The agent wants to run this tool"
      onAllowOnce={
        once
          ? () => respond(APPROVAL_OPTIONS.approved.id, true)
          : () => respondToApproval?.({ approved: true })
      }
      alwaysAllowOptions={[
        ...(alwaysTool
          ? [
              {
                label: alwaysTool.label ?? APPROVAL_OPTIONS["trust-tool"].label,
                onSelect: () => respond(APPROVAL_OPTIONS["trust-tool"].id, true),
              },
            ]
          : []),
        ...(alwaysServer
          ? [
              {
                label: alwaysServer.label ?? APPROVAL_OPTIONS["trust-server"].label,
                onSelect: () => respond(APPROVAL_OPTIONS["trust-server"].id, true),
              },
            ]
          : []),
      ]}
      onDeny={
        deny
          ? () => respond(APPROVAL_OPTIONS.denied.id, false)
          : () => respondToApproval?.({ approved: false })
      }
    />
  );
};
