/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// kardon imports
import { STATE_GROUPS } from "@kardon/constants";
// types
import { useTranslation } from "@kardon/i18n";
import type { IUserStateDistribution } from "@kardon/types";
import { Card, ECardDirection, ECardSpacing } from "@kardon/ui";
// constants

type Props = {
  stateDistribution: IUserStateDistribution[];
};

export function ProfileWorkload({ stateDistribution }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <h3 className="text-16 font-medium">{t("profile.stats.workload")}</h3>
      <div className="grid grid-cols-1 justify-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stateDistribution.map((group) => (
          <div key={group.state_group}>
            <a>
              <Card direction={ECardDirection.ROW} spacing={ECardSpacing.SM}>
                <div
                  className="h-3 w-3 rounded-xs my-2"
                  style={{
                    backgroundColor: STATE_GROUPS[group.state_group].color,
                  }}
                />
                <div className="space-y-1 flex-col">
                  <span className="text-13 text-placeholder">
                    {group.state_group === "unstarted"
                      ? "Not started"
                      : group.state_group === "started"
                        ? "Working on"
                        : STATE_GROUPS[group.state_group].label}
                  </span>
                  <p className="text-18 font-semibold">{group.state_count}</p>
                </div>
              </Card>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
