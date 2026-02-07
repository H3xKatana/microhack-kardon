/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { PageHead } from "@/components/core/page-title";
import { ChannelList } from "@/components/messaging/channel-list";

function ChannelsPage() {
  const { workspaceSlug } = useParams();

  return (
    <>
      <PageHead title="Channels" />
      <div className="relative h-full w-full overflow-hidden overflow-y-auto">
        <ChannelList workspaceSlug={workspaceSlug as string} />
      </div>
    </>
  );
}

export default observer(ChannelsPage);
