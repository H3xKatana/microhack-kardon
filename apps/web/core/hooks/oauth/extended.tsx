/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// kardon imports
import type { TOAuthConfigs } from "@kardon/types";

export const useExtendedOAuthConfig = (_oauthActionText: string): TOAuthConfigs => {
  return {
    isOAuthEnabled: false,
    oAuthOptions: [],
  };
};
