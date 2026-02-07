/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useContext } from "react";
import { StoreContext } from "@/lib/store-context";
import type { IMessagingStore } from "@/store/messaging.store";

export const useMessagingStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useMessagingStore must be used within a StoreProvider");
  }
  return context.messagingStore as unknown as IMessagingStore;
};
