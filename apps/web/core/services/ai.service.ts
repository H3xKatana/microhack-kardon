/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// helpers
import { API_BASE_URL } from "@kardon/constants";
// kardon web constants
import { AI_EDITOR_TASKS } from "@/kardon-web/constants/ai";
// services
import { APIService } from "@/services/api.service";
// types
// FIXME:
// import { IGptResponse } from "@kardon/types";
// helpers

export type TTaskPayload = {
  casual_score?: number;
  formal_score?: number;
  task: AI_EDITOR_TASKS;
  text_input: string;
  selected_model?: string;
};

export class AIService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async createGptTask(workspaceSlug: string, data: { prompt: string; task: string }): Promise<any> {
    return this.post(`/api/workspaces/${workspaceSlug}/ai-assistant/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async performEditorTask(
    workspaceSlug: string,
    data: TTaskPayload
  ): Promise<{
    response: string;
    response_html?: string;
    success?: boolean;
    failure?: boolean;
    operation_type?: string;
    timestamp?: string;
  }> {
    // Use different endpoint for orchestration tasks
    const endpoint = data.task === AI_EDITOR_TASKS.ORCHESTRATE_TASK
      ? `/api/workspaces/${workspaceSlug}/orchestration/`
      : `/api/workspaces/${workspaceSlug}/ai-assistant/`; // Use existing working endpoint as fallback

    return this.post(endpoint, data)
      .then((res) => res?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
