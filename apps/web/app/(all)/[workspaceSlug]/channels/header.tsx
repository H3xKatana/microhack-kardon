/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useTranslation } from "@kardon/i18n";
import { Hash } from "lucide-react";
import { Breadcrumbs, Header } from "@kardon/ui";
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";

export const ChannelsHeader = observer(function ChannelsHeader() {
  const { t } = useTranslation();

  return (
    <>
      <Header>
        <Header.LeftItem>
          <div className="flex items-center gap-2.5">
            <Breadcrumbs>
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink label={t("sidebar.channels")} icon={<Hash className="h-4 w-4 text-tertiary" />} />
                }
              />
            </Breadcrumbs>
          </div>
        </Header.LeftItem>

        <Header.RightItem>
          <span />
        </Header.RightItem>
      </Header>
    </>
  );
});
