/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

const kardonTheme = create({
  base: "dark",
  brandTitle: "Plane UI",
  brandUrl: "https://kardon.so",
  brandImage: "kardon-lockup-light.svg",
  brandTarget: "_self",
});

addons.setConfig({
  theme: kardonTheme,
});
