/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export enum AI_EDITOR_TASKS {
  ASK_ANYTHING = "ASK_ANYTHING",
  ORCHESTRATE_TASK = "ORCHESTRATE_TASK",
}

export const LOADING_TEXTS: {
  [key in AI_EDITOR_TASKS]: string;
} = {
  [AI_EDITOR_TASKS.ASK_ANYTHING]: "Pi is generating response",
  [AI_EDITOR_TASKS.ORCHESTRATE_TASK]: "Orchestrator is processing your request",
};
