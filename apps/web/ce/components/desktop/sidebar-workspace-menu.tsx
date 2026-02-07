/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useMemo } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
// kardon imports
import { 
  WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS,
  WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS_LINKS,
  EUserPermissionsLevel,
} from "@kardon/constants";
import { useTranslation } from "@kardon/i18n";
import { PiChatLogo, DraftIcon, HomeIcon, YourWorkIcon } from "@kardon/propel/icons";
import { EUserWorkspaceRoles } from "@kardon/types";
// components
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
// hooks
import { useUserPermissions, useUser } from "@/hooks/store/user";
import {
  usePersonalNavigationPreferences,
} from "@/hooks/use-navigation-preferences";
import { useAppTheme } from "@/hooks/store/use-app-theme";

export const DesktopSidebarWorkspaceMenu = observer(function DesktopSidebarWorkspaceMenu() {
  // navigation
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  // store hooks
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();
  const { data: currentUser } = useUser();
  const { preferences: personalPreferences } = usePersonalNavigationPreferences();
  const { toggleSidebar } = useAppTheme();
  // translation
  const { t } = useTranslation();

  // Filter static navigation items based on personal preferences
  const filteredStaticNavigationItems = useMemo(() => {
    const items = [...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS_LINKS];
    const personalItems: Array<(typeof items)[0] & { sort_order: number }> = [];

    // Add personal items based on preferences with their sort_order
    const stickiesItem = WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["stickies"];
    if (personalPreferences.items.stickies?.enabled && stickiesItem) {
      personalItems.push({
        ...stickiesItem,
        sort_order: personalPreferences.items.stickies.sort_order,
      });
    }
    if (personalPreferences.items.your_work?.enabled && WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["your-work"]) {
      personalItems.push({
        ...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["your-work"],
        sort_order: personalPreferences.items.your_work.sort_order,
      });
    }
    if (personalPreferences.items.drafts?.enabled && WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["drafts"]) {
      personalItems.push({
        ...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["drafts"],
        sort_order: personalPreferences.items.drafts.sort_order,
      });
    }
    if (personalPreferences.items.pi_chat?.enabled && WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["agents-orchestrator"]) {
      personalItems.push({
        ...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["agents-orchestrator"],
        sort_order: personalPreferences.items.pi_chat.sort_order,
      });
    }
    // Always add Agents Orchestrator item regardless of preferences
    if (WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["agents-orchestrator"]) {
      personalItems.push({
        ...WORKSPACE_SIDEBAR_STATIC_NAVIGATION_ITEMS["agents-orchestrator"],
        sort_order: 2, // Position after your_work (1) and before drafts (5)
      });
    }

    // Sort personal items by sort_order
    personalItems.sort((a, b) => a.sort_order - b.sort_order);

    // Merge static items with sorted personal items
    return [...items, ...personalItems];
  }, [personalPreferences]);

  const draftIssueCount = workspaceUserInfo[workspaceSlug.toString()]?.draft_issue_count;

  // Define icon mapping
  const iconMap: Record<string, React.FC<any>> = {
    home: HomeIcon,
    "your-work": YourWorkIcon,
    drafts: DraftIcon,
    "ai-agent": PiChatLogo,
    "agents-orchestrator": PiChatLogo,
  };

  return (
    <div className="flex flex-col gap-0.5">
      {filteredStaticNavigationItems.map((item) => {
        // Skip drafts if count is 0
        if (item.key === "drafts" && draftIssueCount === 0) return null;
        
        // Check user permissions
        if (!currentUser) return null;
        
        // Check if user has access to this item
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!allowPermissions(item.access as any, EUserPermissionsLevel.WORKSPACE, workspaceSlug.toString())) return null;
        
        const isActive = item.highlight(pathname, `/${workspaceSlug}${item.href}`);
        const IconComponent = iconMap[item.key] || (() => null);

        const handleLinkClick = () => {
          if (window.innerWidth < 768) {
            toggleSidebar();
          }
        };

        return (
          <Link 
            key={item.key} 
            href={`/${workspaceSlug}${item.href}`}
            className="no-underline"
            onClick={handleLinkClick}
          >
            <SidebarNavItem isActive={isActive}>
              <div className="flex items-center gap-1.5 py-[1px]">
                <IconComponent className="size-4 flex-shrink-0" />
                <p className="text-13 leading-5 font-medium">{t(item.labelTranslationKey)}</p>
              </div>
            </SidebarNavItem>
          </Link>
        );
      })}
    </div>
  );
});
