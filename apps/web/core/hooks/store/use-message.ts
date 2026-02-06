/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useContext } from "react";
import { IMessageStore } from "@kardon/shared-state";
import { observerContext } from "@/hooks/context";

export const useMessage = (): IMessageStore => {
  const context = useContext(observerContext);
  if (context === undefined) {
    throw new Error("useMessage must be used within an ObserverProvider");
  }
  return context.message;
};