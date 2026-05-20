import { z } from 'zod'

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

/** Available Pro plan statuses. */
export const PRO_PLAN_STATUSES = ['Active', 'Downgraded', 'Cancelled', 'NeverSubscribed'] as const
/** Subscription status of a Pro plan. */
export type ProPlanStatus = (typeof PRO_PLAN_STATUSES)[number]

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
    taxBehavior: z.string(),
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
    currentPlanStatus: z.enum(PRO_PLAN_STATUSES),
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
