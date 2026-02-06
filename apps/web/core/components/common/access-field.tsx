/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { LucideIcon } from "lucide-react";
// kardon ui
import { useTranslation } from "@kardon/i18n";
import type { ISvgIcons } from "@kardon/propel/icons";
import { Tooltip } from "@kardon/propel/tooltip";
// kardon utils
import { cn } from "@kardon/utils";

type Props = {
  onChange: (value: number) => void;
  value: number;
  accessSpecifiers: {
    key: number;
    i18n_label?: string;
    label?: string;
    icon: LucideIcon | React.FC<ISvgIcons>;
  }[];
  isMobile?: boolean;
};

// TODO: Remove label once i18n is done
export function AccessField(props: Props) {
  const { onChange, value, accessSpecifiers, isMobile = false } = props;
  const { t } = useTranslation();

  return (
    <div className="flex flex-shrink-0 items-stretch gap-0.5 rounded-sm border-[1px] border-subtle p-1">
      {accessSpecifiers.map((access, index) => {
        const label = access.i18n_label ? t(access.i18n_label) : access.label;
        return (
          <Tooltip key={access.key} tooltipContent={label} isMobile={isMobile}>
            <button
              type="button"
              onClick={() => onChange(access.key)}
              className={cn(
                "flex-shrink-0 relative flex justify-center items-center w-5 h-5 rounded-xs p-1 transition-all",
                value === access.key ? "bg-layer-1" : "hover:bg-layer-1"
              )}
              tabIndex={2 + index}
            >
              <access.icon
                className={cn("h-3.5 w-3.5 transition-all", value === access.key ? "text-primary" : "text-placeholder")}
                strokeWidth={2}
              />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
