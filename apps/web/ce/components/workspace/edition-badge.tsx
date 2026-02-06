import { useState } from "react";
import { observer } from "mobx-react";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";

// local components


// import logo
import logo from "@/app/assets/logo.png";

export const WorkspaceEditionBadge = observer(function WorkspaceEditionBadge() {
  // states
  const [isPaidPlanPurchaseModalOpen, setIsPaidPlanPurchaseModalOpen] = useState(false);
  // platform
  const { isMobile } = usePlatformOS();

  return (
    <div className="flex mx-auto items-center ">
      <img
        src={logo}
        className="scale-200"
        alt="Workspace Logo"
        style={{
          height: isMobile ? 24 : 52,
          width: "auto",
          display: "block",
        }}
      />
      <div
        className="mx-2 font-bold text-[24px]"
        style={{
          color: "#FFFF90", // golden color
          fontFamily: "Georgia, 'Times New Roman', serif", // classical font
        }}
      >
        TAVROS
      </div>
    </div>
  );
});
