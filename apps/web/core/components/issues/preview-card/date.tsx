/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { CalendarDays } from "lucide-react";
// kardon imports
import { DueDatePropertyIcon, StartDatePropertyIcon } from "@kardon/propel/icons";
import type { TStateGroups } from "@kardon/types";
import { cn, renderFormattedDate, shouldHighlightIssueDueDate } from "@kardon/utils";

type Props = {
  startDate: string | null;
  stateGroup: TStateGroups;
  targetDate: string | null;
};

export function WorkItemPreviewCardDate(props: Props) {
  const { startDate, stateGroup, targetDate } = props;
  // derived values
  const isDateRangeEnabled = Boolean(startDate && targetDate);
  const shouldHighlightDate = shouldHighlightIssueDueDate(targetDate, stateGroup);

  if (!startDate && !targetDate) return null;

  return (
    <div className="text-11 h-full rounded-sm px-1 text-secondary">
      {isDateRangeEnabled ? (
        <div
          className={cn("h-full flex items-center gap-1", {
            "text-danger-primary": shouldHighlightDate,
          })}
        >
          <CalendarDays className="shrink-0 size-3" />
          <span>
            {renderFormattedDate(startDate)} - {renderFormattedDate(targetDate)}
          </span>
        </div>
      ) : startDate ? (
        <div className="h-full flex items-center gap-1">
          <StartDatePropertyIcon className="shrink-0 size-3" />
          <span>{renderFormattedDate(startDate)}</span>
        </div>
      ) : (
        <div
          className={cn("h-full flex items-center gap-1", {
            "text-danger-primary": shouldHighlightDate,
          })}
        >
          <DueDatePropertyIcon className="shrink-0 size-3" />
          <span>{renderFormattedDate(targetDate)}</span>
        </div>
      )}
    </div>
  );
}
