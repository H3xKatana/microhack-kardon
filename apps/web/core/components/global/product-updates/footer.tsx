/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { USER_TRACKER_ELEMENTS } from "@kardon/constants";
import { useTranslation } from "@kardon/i18n";
// ui
import { getButtonStyling } from "@kardon/propel/button";
import { PlaneLogo } from "@kardon/propel/icons";
// helpers
import { cn } from "@kardon/utils";

export function ProductUpdatesFooter() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between flex-shrink-0 gap-4 m-6 mb-4">
      <div className="flex items-center gap-2">
        <a
          href="https://go.kardon.so/p-docs"
          target="_blank"
          className="text-13 text-secondary hover:text-primary hover:underline underline-offset-1 outline-none"
          rel="noreferrer"
        >
          {t("docs")}
        </a>
        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
          <circle cx={1} cy={1} r={1} />
        </svg>
        <a
          data-ph-element={USER_TRACKER_ELEMENTS.CHANGELOG_REDIRECTED}
          href="https://go.kardon.so/p-changelog"
          target="_blank"
          className="text-13 text-secondary hover:text-primary hover:underline underline-offset-1 outline-none"
          rel="noreferrer"
        >
          {t("full_changelog")}
        </a>
        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
          <circle cx={1} cy={1} r={1} />
        </svg>
        <a
          href="mailto:support@kardon.so"
          target="_blank"
          className="text-13 text-secondary hover:text-primary hover:underline underline-offset-1 outline-none"
          rel="noreferrer"
        >
          {t("support")}
        </a>
        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
          <circle cx={1} cy={1} r={1} />
        </svg>
        <a
          href="https://go.kardon.so/p-discord"
          target="_blank"
          className="text-13 text-secondary hover:text-primary hover:underline underline-offset-1 outline-none"
          rel="noreferrer"
        >
          Discord
        </a>
      </div>
      <a
        href="https://kardon.so/pages"
        target="_blank"
        className={cn(
          getButtonStyling("secondary", "base"),
          "flex gap-1.5 items-center text-center font-medium hover:underline underline-offset-2 outline-none"
        )}
        rel="noreferrer"
      >
        <PlaneLogo className="h-4 w-auto text-primary" />
        {t("powered_by_kardon_pages")}
      </a>
    </div>
  );
}
