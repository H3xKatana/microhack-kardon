/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "@kardon/i18n";
// ui
import { Button } from "@kardon/propel/button";
import { AiIcon } from "@kardon/propel/icons";
import { Breadcrumbs, Header } from "@kardon/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { CreateUpdateIssueModal } from "@/components/issues/issue-modal/modal";

export const PiChatHeader = observer(function PiChatHeader() {
  // state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  const { t } = useTranslation();

  return (
    <>
      <CreateUpdateIssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        isDraft
      />
      <Header>
        <Header.LeftItem>
          <div className="flex items-center gap-2.5">
            <Breadcrumbs>
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink label={t("Agents Orchestrator")} icon={<AiIcon className="h-4 w-4 text-tertiary" />} />
                }
              />
            </Breadcrumbs>
          </div>
        </Header.LeftItem>

        <Header.RightItem>
          {/* Add any right-side buttons if needed */}
        </Header.RightItem>
      </Header>
    </>
  );
});