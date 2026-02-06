/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TIssueLayout } from "@kardon/constants";
import { ListLayoutIcon, BoardLayoutIcon } from "@kardon/propel/icons";
import type { ISvgIcons } from "@kardon/propel/icons";

export function IssueLayoutIcon({
  layout,
  size,
  ...props
}: { layout: TIssueLayout; size?: number } & Omit<ISvgIcons, "width" | "height">) {
  const iconProps = {
    ...props,
    ...(size && { width: size, height: size }),
  };

  switch (layout) {
    case "list":
      return <ListLayoutIcon {...iconProps} />;
    case "kanban":
      return <BoardLayoutIcon {...iconProps} />;
    default:
      return null;
  }
}
