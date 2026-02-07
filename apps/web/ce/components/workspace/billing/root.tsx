/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
// kardon imports
import { DEFAULT_PRODUCT_BILLING_FREQUENCY, SUBSCRIPTION_WITH_BILLING_FREQUENCY } from "@kardon/constants";
import { useTranslation } from "@kardon/i18n";
import type { TBillingFrequency, TProductBillingFrequency } from "@kardon/types";
import { EProductSubscriptionEnum } from "@kardon/types";
// components
import { SettingsBoxedControlItem } from "@/components/settings/boxed-control-item";
import { SettingsHeading } from "@/components/settings/heading";
// local imports
import { PlansComparison } from "./comparison/root";

export const BillingRoot = observer(function BillingRoot() {
  const [isCompareAllFeaturesSectionOpen, setIsCompareAllFeaturesSectionOpen] = useState(false);
  const [productBillingFrequency, setProductBillingFrequency] = useState<TProductBillingFrequency>(
    DEFAULT_PRODUCT_BILLING_FREQUENCY
  );
  const { t } = useTranslation();

  /**
   * Retrieves the billing frequency for a given subscription type
   * @param {EProductSubscriptionEnum} subscriptionType - Type of subscription to get frequency for
   * @returns {TBillingFrequency | undefined} - Billing frequency if subscription supports it, undefined otherwise
   */
  const getBillingFrequency = (subscriptionType: EProductSubscriptionEnum): TBillingFrequency | undefined =>
    SUBSCRIPTION_WITH_BILLING_FREQUENCY.includes(subscriptionType)
      ? productBillingFrequency[subscriptionType]
      : undefined;

  /**
   * Updates the billing frequency for a specific subscription type
   * @param {EProductSubscriptionEnum} subscriptionType - Type of subscription to update
   * @param {TBillingFrequency} frequency - New billing frequency to set
   * @returns {void}
   */
  const setBillingFrequency = (subscriptionType: EProductSubscriptionEnum, frequency: TBillingFrequency): void =>
    setProductBillingFrequency({ ...productBillingFrequency, [subscriptionType]: frequency });

  return (

  <section className="relative size-full overflow-y-auto scrollbar-hide p-6">
    <div className="max-w-2xl rounded-sm  backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
      
      <div className="relative p-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-white">MicroHack 3.0</h3>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white">
            EXCLUSIVE
          </span>
        </div>
        
        <p className="text-sm text-gray-400 mb-6">
          Enterprise Annual Plan - APCS Collaboration Platform
        </p>
        
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-4xl font-bold text-white">100M</span>
          <span className="text-gray-400">DZD/year</span>
          <span className="ml-auto text-xs font-semibold text-green-400">Save 33%</span>
        </div>

        <div className="space-y-2">
          <button className="w-full px-4 py-2.5 rounded-lg border  border-white/20   text-white font-semibold hover:shadow-lg hover:bg-white/10  transition-all">
            Claim Offer
          </button>
          <a 
            href="https://microhack.microclub.info/themes/theme1" 
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 py-2.5 rounded-lg border border-white/20 text-white text-center font-semibold hover:bg-white/10  transition-all"
          >
            View Details
          </a>
        </div>
      </div>
    </div>
  </section>

  );
});
