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

/** Arguments for upgrading to a Pro plan. */
export type UpgradeToProArgs = {
    currency: string
    billingCycle: BillingCycle
    successUrl: string
    cancelUrl: string
    promotionCode?: string | null
    trialPeriodDays?: number | null
    partnershipId?: string | null
}

/** Arguments for starting a Pro trial. */
export type StartProTrialArgs = {
    currency: string
    billingCycle: BillingCycle
    successUrl: string
    cancelUrl: string
}

/** Arguments for opening the Pro billing portal. */
export type ProBillingPortalArgs = {
    returnUrl: string
    flowType?: string | null
    promotionCode?: string | null
}

/** Arguments for upgrading a workspace. */
export type UpgradeWorkspaceArgs = {
    workspaceId: string
    currency: string
    billingCycle: BillingCycle
    successUrl: string
    cancelUrl: string
    promotionCode?: string | null
    partnershipId?: string | null
}

/** Arguments for starting a workspace trial. */
export type StartWorkspaceTrialArgs = {
    workspaceId: string
    currency: string
    billingCycle: BillingCycle
    successUrl: string
    cancelUrl: string
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
