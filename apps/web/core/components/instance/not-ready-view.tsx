/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FC } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { GOD_MODE_URL } from "@kardon/constants";
import { Button } from "@kardon/propel/button";
import { KardonLockup } from "@kardon/propel/icons";
// assets
import KardonBackgroundPatternDark from "@/app/assets/auth/background-pattern-dark.svg?url";
import KardonBackgroundPattern from "@/app/assets/auth/background-pattern.svg?url";
import KardonTakeOffImage from "@/app/assets/kardon-takeoff.png?url";

export function InstanceNotReady() {
  const { resolvedTheme } = useTheme();
  const patternBackground = resolvedTheme === "dark" ? KardonBackgroundPatternDark : KardonBackgroundPattern;

  return (
    <div className="relative">
      <div className="h-screen w-full overflow-hidden overflow-y-auto flex flex-col">
        <div className="container h-[110px] flex-shrink-0 mx-auto px-5 lg:px-0 flex items-center justify-between gap-5 z-50">
          <div className="flex items-center gap-x-2 py-10">
            <Link href={`/`}>
              <KardonLockup className="h-7 w-auto text-primary" />
            </Link>
          </div>
        </div>

        <div className="absolute inset-0 z-0">
          <img src={patternBackground} className="w-full h-full object-cover" alt="Kardon background pattern" />
        </div>

        <div className="relative z-10 mb-[110px] flex-grow">
          <div className="h-full w-full relative container px-5 mx-auto flex justify-center items-center">
            <div className="w-auto max-w-2xl relative space-y-8 py-10">
              <div className="relative flex flex-col justify-center items-center space-y-4">
                <h1 className="text-24 font-bold pb-3">Welcome aboard Kardon!</h1>
                <img src={KardonTakeOffImage} className="w-full h-full object-cover" alt="Kardon Logo" />
                <p className="font-medium text-14 text-placeholder">
                  Get started by setting up your instance and workspace
                </p>
              </div>
              <div>
                <a href={GOD_MODE_URL}>
                  <Button size="xl" className="w-full">
                    Get started
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
