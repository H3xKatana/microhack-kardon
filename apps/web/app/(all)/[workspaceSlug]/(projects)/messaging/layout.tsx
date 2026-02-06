/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { PropsWithChildren } from "react";

const MessagingLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="h-full w-full">
      {children}
    </div>
  );
};

export default MessagingLayout;