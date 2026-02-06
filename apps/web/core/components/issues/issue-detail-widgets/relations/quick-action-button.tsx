/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FC } from "react";
import React from "react";
import { observer } from "mobx-react";

import { useTranslation } from "@kardon/i18n";
import { PlusIcon } from "@kardon/propel/icons";
// kardon imports
import type { TIssueServiceType } from "@kardon/types";
import { CustomMenu } from "@kardon/ui";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// Plane-web
import { useTimeLineRelationOptions } from "@/kardon-web/components/relations";
import type { TIssueRelationTypes } from "@/kardon-web/types";

type Props = {
  issueId: string;
  customButton?: React.ReactNode;
  disabled?: boolean;
  issueServiceType: TIssueServiceType;
};

export const RelationActionButton = observer(function RelationActionButton(props: Props) {
  const { customButton, issueId, disabled = false, issueServiceType } = props;
  const { t } = useTranslation();
  // store hooks
  const { toggleRelationModal, setRelationKey } = useIssueDetail(issueServiceType);

  const ISSUE_RELATION_OPTIONS = useTimeLineRelationOptions();

  // handlers
  const handleOnClick = (relationKey: TIssueRelationTypes) => {
    setRelationKey(relationKey);
    toggleRelationModal(issueId, relationKey);
  };

  // button element
  const customButtonElement = customButton ? <>{customButton}</> : <PlusIcon className="h-4 w-4" />;

  return (
    <CustomMenu
      customButton={customButtonElement}
      placement="bottom-start"
      disabled={disabled}
      maxHeight="lg"
      closeOnSelect
    >
      {Object.values(ISSUE_RELATION_OPTIONS).map((item, index) => {
        if (!item) return <></>;

        return (
          <CustomMenu.MenuItem
            key={index}
            onClick={() => {
              handleOnClick(item.key);
            }}
          >
            <div className="flex items-center gap-2">
              {item.icon(12)}
              <span>{t(item.i18n_label)}</span>
            </div>
          </CustomMenu.MenuItem>
        );
      })}
    </CustomMenu>
  );
});
