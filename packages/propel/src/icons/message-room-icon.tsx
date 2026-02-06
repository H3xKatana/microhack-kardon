/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { Icon, type TIconProps } from "./icon";

export const MessageRoomIcon = React.forwardRef<SVGSVGElement, TIconProps>((props, ref) => {
  return (
    <Icon {...props} ref={ref}>
      <path
        d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z"
        fill="currentColor"
      />
    </Icon>
  );
});

MessageRoomIcon.displayName = "MessageRoomIcon";