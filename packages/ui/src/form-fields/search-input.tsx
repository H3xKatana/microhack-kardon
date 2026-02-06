/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { Input } from "./input";
import { SearchIcon } from "@kardon/propel/icons";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  iconPosition?: "left" | "right";
}

export const SearchInput = ({
  className = "",
  iconPosition = "left",
  ...props
}: SearchInputProps) => {
  return (
    <div className="relative">
      {iconPosition === "left" && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-4 w-4 text-gray-400" />
        </div>
      )}
      <Input
        {...props}
        type="search"
        className={`pl-10 ${className}`}
      />
      {iconPosition === "right" && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <SearchIcon className="h-4 w-4 text-gray-400" />
        </div>
      )}
    </div>
  );
};