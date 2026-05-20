import { z } from 'zod'

import { WORKSPACE_PLAN_STATUSES } from '../workspaces/types'

/** Available subscription statuses. */
export const BILLING_SUBSCRIPTION_STATUSES = [
    'none',
    'autorenew',
    'canceled',
    'expired',
    'trial',
    'trial_canceled',
] as const
/** Current subscription status. */
export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number]

/** Available plan tiers. */
export const BILLING_PLANS = ['free', 'pro', 'pro_gifted', 'pro_legacy'] as const
/** Plan tier a user is currently on. */
export type BillingPlan = (typeof BILLING_PLANS)[number]

/** Ways an active subscription can be purchased. */
export const BILLING_ACTIVATION_METHODS = [
    'stripe',
    'appstore',
    'playstore',
    'teams',
    'manual',
] as const
/** How an active subscription was purchased. */
export type BillingActivationMethod = (typeof BILLING_ACTIVATION_METHODS)[number]

/** Available billing cycles. */
export const BILLING_CYCLES = ['monthly', 'yearly'] as const
/** Billing cycle for a plan price. */
export type BillingCycle = (typeof BILLING_CYCLES)[number]

/** Available tax behaviors for a price. */
export const TAX_BEHAVIORS = ['exclusive', 'inclusive', 'unspecified'] as const
/** Tax behavior for a plan price. */
export type TaxBehavior = (typeof TAX_BEHAVIORS)[number]

export const BillingPlanPriceSchema = z.object({
    amount: z.string(),
    rawAmount: z.number(),
    currency: z.string(),
    billingCycle: z.enum(BILLING_CYCLES).nullable(),
    taxBehavior: z.enum(TAX_BEHAVIORS),
})

/** Price of an active plan. */
export type BillingPlanPrice = z.infer<typeof BillingPlanPriceSchema>

export const SubscriptionInfoSchema = z.object({
    status: z.enum(BILLING_SUBSCRIPTION_STATUSES),
    plan: z.enum(BILLING_PLANS),
    expirationDate: z.string().nullable(),
    activationMethod: z.enum(BILLING_ACTIVATION_METHODS),
    planPrice: BillingPlanPriceSchema.nullable(),
    billingPortalUrl: z.string().nullable(),
    billingPortalSwitchToAnnualUrl: z.string().nullable(),
    hasBillingPortal: z.boolean(),
    hasBillingPortalSwitchToAnnual: z.boolean(),
    invoiceCreditBalance: z.record(z.string(), z.number().int()).nullable(),
    hasSwitchLegacyToCurrent: z.boolean(),
})

/** Current subscription state of a user. */
export type SubscriptionInfo = z.infer<typeof SubscriptionInfoSchema>

export const FormattedPriceSchema = z.object({
    currency: z.string(),
    unitAmount: z.number().int(),
    taxBehavior: z.enum(TAX_BEHAVIORS),
})

/** A single price within a billing-cycle listing. */
export type FormattedPrice = z.infer<typeof FormattedPriceSchema>

export const PriceListingSchema = z.object({
    billingCycle: z.enum(BILLING_CYCLES),
    prices: z.array(FormattedPriceSchema),
})

/** Prices available for a given billing cycle. */
export type PriceListing = z.infer<typeof PriceListingSchema>

export const ProPlanDetailsSchema = z.object({
    currentPlanStatus: z.enum(WORKSPACE_PLAN_STATUSES),
    downgradeAt: z.string().nullable(),
    priceList: z.array(PriceListingSchema),
})

/** Pro plan and billing details. */
export type ProPlanDetails = z.infer<typeof ProPlanDetailsSchema>

export const PricesResponseSchema = z.object({
    pro: z.array(PriceListingSchema),
    teams: z.array(PriceListingSchema),
})

/** Available Pro and Teams prices. */
export type PricesResponse = z.infer<typeof PricesResponseSchema>

/**
 * Monthly and yearly amounts for a single currency. Each amount is a number in
 * the currency's smallest unit, or a localized formatted string when the
 * `pricing` endpoint is called with `formatted: true`.
 */
export const PricingTermsSchema = z.object({
    monthly: z.union([z.number(), z.string()]),
    yearly: z.union([z.number(), z.string()]),
})

/** Monthly/yearly amounts for one currency. */
export type PricingTerms = z.infer<typeof PricingTermsSchema>

/**
 * Response of the `pricing` endpoint: a mix of version-pointer strings
 * (`latestPro`, `latestBiz`, `sessionPro`, `sessionBiz`) and version keys
 * (`v1`, `v2`, …) each mapping plan name → currency code → {@link PricingTerms}.
 */
export const PricingResponseSchema = z.record(
    z.string(),
    z.union([z.string(), z.record(z.string(), z.record(z.string(), PricingTermsSchema))]),
)

/** Current and legacy Pro/Teams pricing keyed by version. */
export type PricingResponse = z.infer<typeof PricingResponseSchema>
