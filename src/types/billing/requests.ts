import type { BillingCycle } from './types'

/** Arguments for cancelling the current plan. */
export type CancelPlanArgs = {
    /** Short identifier of the cancellation reason category. */
    reasonFlag?: string
    /** Human-readable label of the cancellation reason. */
    reasonDescription?: string
    /** Free-form feedback from the user about the cancellation. */
    reasonText?: string
    /** URL the user is redirected to after completing the flow. */
    returnUrl?: string
}

/** Common arguments for any Stripe checkout (upgrade or trial) request. */
export type CheckoutArgs = {
    currency: string
    billingCycle: BillingCycle
    successUrl: string
    cancelUrl: string
}

/** Optional promotion/partnership attribution shared by upgrade requests. */
export type UpgradeOptions = {
    promotionCode?: string | null
    partnershipId?: string | null
}

/** Arguments for upgrading to a Pro plan. */
export type UpgradeToProArgs = CheckoutArgs &
    UpgradeOptions & {
        trialPeriodDays?: number | null
    }

/** Arguments for starting a Pro trial. */
export type StartProTrialArgs = CheckoutArgs

/** Arguments for opening the Pro billing portal. */
export type ProBillingPortalArgs = {
    returnUrl: string
    flowType?: string | null
    promotionCode?: string | null
}

/** Arguments for upgrading a workspace. */
export type UpgradeWorkspaceArgs = CheckoutArgs &
    UpgradeOptions & {
        workspaceId: string
    }

/** Arguments for starting a workspace trial. */
export type StartWorkspaceTrialArgs = CheckoutArgs & {
    workspaceId: string
}

/** Arguments for opening the workspace billing portal. */
export type WorkspaceBillingPortalArgs = {
    workspaceId: string
    returnUrl: string
    flowType?: string | null
}

/** Arguments for fetching pricing. */
export type GetPricingArgs = {
    formatted?: boolean
}

/** Response containing a Stripe checkout session URL. */
export type CheckoutSessionResponse = {
    checkoutSessionUrl: string
}

/** Response containing a Stripe billing portal URL. */
export type BillingPortalUrlResponse = {
    billingPortalUrl: string
}
