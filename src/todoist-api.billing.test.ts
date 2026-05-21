import { TodoistApi } from '.'
import {
    getSyncBaseUri,
    ENDPOINT_PAYMENTS_SUBSCRIPTION_INFO,
    ENDPOINT_PAYMENTS_CANCEL_PLAN,
    ENDPOINT_PAYMENTS_REACTIVATE_PLAN,
    ENDPOINT_PRO_UPGRADE,
    ENDPOINT_PRO_TRIAL,
    ENDPOINT_PRO_BILLING_PORTAL,
    ENDPOINT_PRO_PLAN_DETAILS,
    ENDPOINT_WORKSPACE_UPGRADE,
    ENDPOINT_WORKSPACE_TRIAL,
    ENDPOINT_WORKSPACE_BILLING_PORTAL,
    ENDPOINT_PRICES,
    ENDPOINT_PRICING,
} from './consts/endpoints'
import type { DefaultBodyType } from 'msw'

import { server, http, HttpResponse } from './test-utils/msw-setup'
import { DEFAULT_AUTH_TOKEN } from './test-utils/test-defaults'

function getTarget() {
    return new TodoistApi(DEFAULT_AUTH_TOKEN)
}

/**
 * Mocks a POST endpoint with a 200 JSON response and returns an accessor for
 * the captured (parsed) request body, so write tests can assert serialization.
 */
function mockPost(endpoint: string, response: DefaultBodyType): () => unknown {
    let capturedBody: unknown
    server.use(
        http.post(`${getSyncBaseUri()}${endpoint}`, async ({ request }) => {
            capturedBody = await request.json().catch(() => undefined)
            return HttpResponse.json(response, { status: 200 })
        }),
    )
    return () => capturedBody
}

/**
 * Mocks a GET endpoint with a 200 JSON response and returns an accessor for the
 * captured request URL, so read tests can assert query parameters.
 */
function mockGet(endpoint: string, response: DefaultBodyType): () => URL | undefined {
    let capturedUrl: URL | undefined
    server.use(
        http.get(`${getSyncBaseUri()}${endpoint}`, ({ request }) => {
            capturedUrl = new URL(request.url)
            return HttpResponse.json(response, { status: 200 })
        }),
    )
    return () => capturedUrl
}

const RAW_SUBSCRIPTION_INFO = {
    status: 'autorenew',
    plan: 'pro',
    expiration_date: '2026-12-31',
    activation_method: 'stripe',
    plan_price: {
        amount: '600',
        raw_amount: 600,
        currency: 'USD',
        billing_cycle: 'monthly',
        tax_behavior: 'exclusive',
    },
    billing_portal_url: 'https://billing.stripe.com/portal/abc',
    billing_portal_switch_to_annual_url: null,
    has_billing_portal: true,
    has_billing_portal_switch_to_annual: false,
    invoice_credit_balance: { usd: 0 },
    has_switch_legacy_to_current: false,
}

const EXPECTED_SUBSCRIPTION_INFO = {
    status: 'autorenew',
    plan: 'pro',
    expirationDate: '2026-12-31',
    activationMethod: 'stripe',
    planPrice: {
        amount: '600',
        rawAmount: 600,
        currency: 'USD',
        billingCycle: 'monthly',
        taxBehavior: 'exclusive',
    },
    billingPortalUrl: 'https://billing.stripe.com/portal/abc',
    billingPortalSwitchToAnnualUrl: null,
    hasBillingPortal: true,
    hasBillingPortalSwitchToAnnual: false,
    invoiceCreditBalance: { usd: 0 },
    hasSwitchLegacyToCurrent: false,
}

describe('TodoistApi billing endpoints', () => {
    describe('getSubscriptionInfo', () => {
        test('returns parsed subscription info', async () => {
            mockPost(ENDPOINT_PAYMENTS_SUBSCRIPTION_INFO, RAW_SUBSCRIPTION_INFO)

            const result = await getTarget().getSubscriptionInfo()

            expect(result).toEqual(EXPECTED_SUBSCRIPTION_INFO)
        })

        test('tolerates null planPrice and invoiceCreditBalance', async () => {
            mockPost(ENDPOINT_PAYMENTS_SUBSCRIPTION_INFO, {
                ...RAW_SUBSCRIPTION_INFO,
                status: 'none',
                plan: 'free',
                expiration_date: null,
                plan_price: null,
                invoice_credit_balance: null,
            })

            const result = await getTarget().getSubscriptionInfo()

            expect(result.planPrice).toBeNull()
            expect(result.invoiceCreditBalance).toBeNull()
            expect(result.expirationDate).toBeNull()
        })
    })

    describe('cancelPlan', () => {
        test('sends reason fields and returns billing portal url', async () => {
            const getBody = mockPost(ENDPOINT_PAYMENTS_CANCEL_PLAN, {
                billing_portal_url: 'https://billing.stripe.com/cancel',
            })

            const result = await getTarget().cancelPlan({
                reasonFlag: 'too_expensive',
                reasonDescription: "It's too expensive",
                reasonText: 'No longer used',
                returnUrl: 'https://todoist.com/app/settings/subscription',
            })

            expect(result).toEqual({ billingPortalUrl: 'https://billing.stripe.com/cancel' })
            expect(getBody()).toEqual({
                reason_flag: 'too_expensive',
                reason_description: "It's too expensive",
                reason_text: 'No longer used',
                return_url: 'https://todoist.com/app/settings/subscription',
            })
        })
    })

    describe('reactivatePlan', () => {
        test('returns parsed subscription info', async () => {
            mockPost(ENDPOINT_PAYMENTS_REACTIVATE_PLAN, RAW_SUBSCRIPTION_INFO)

            const result = await getTarget().reactivatePlan()

            expect(result).toEqual(EXPECTED_SUBSCRIPTION_INFO)
        })
    })

    describe('upgradeToPro', () => {
        test('sends snake_cased body and returns checkout session url', async () => {
            const getBody = mockPost(ENDPOINT_PRO_UPGRADE, {
                checkout_session_url: 'https://checkout.stripe.com/pro',
            })

            const result = await getTarget().upgradeToPro({
                currency: 'USD',
                billingCycle: 'yearly',
                successUrl: 'https://todoist.com/success',
                cancelUrl: 'https://todoist.com/cancel',
                promotionCode: 'PROMO',
                trialPeriodDays: 14,
            })

            expect(result).toEqual({ checkoutSessionUrl: 'https://checkout.stripe.com/pro' })
            expect(getBody()).toEqual({
                currency: 'USD',
                billing_cycle: 'yearly',
                success_url: 'https://todoist.com/success',
                cancel_url: 'https://todoist.com/cancel',
                promotion_code: 'PROMO',
                trial_period_days: 14,
            })
        })
    })

    describe('startProTrial', () => {
        test('sends snake_cased body and returns checkout session url', async () => {
            const getBody = mockPost(ENDPOINT_PRO_TRIAL, {
                checkout_session_url: 'https://checkout.stripe.com/trial',
            })

            const result = await getTarget().startProTrial({
                currency: 'USD',
                billingCycle: 'monthly',
                successUrl: 'https://todoist.com/success',
                cancelUrl: 'https://todoist.com/cancel',
            })

            expect(result).toEqual({ checkoutSessionUrl: 'https://checkout.stripe.com/trial' })
            expect(getBody()).toEqual({
                currency: 'USD',
                billing_cycle: 'monthly',
                success_url: 'https://todoist.com/success',
                cancel_url: 'https://todoist.com/cancel',
            })
        })
    })

    describe('createProBillingPortalSession', () => {
        test('sends return url and returns billing portal url', async () => {
            const getBody = mockPost(ENDPOINT_PRO_BILLING_PORTAL, {
                billing_portal_url: 'https://billing.stripe.com/pro',
            })

            const result = await getTarget().createProBillingPortalSession({
                returnUrl: 'https://todoist.com/app/settings',
                flowType: 'payment_method_update',
            })

            expect(result).toEqual({ billingPortalUrl: 'https://billing.stripe.com/pro' })
            expect(getBody()).toEqual({
                return_url: 'https://todoist.com/app/settings',
                flow_type: 'payment_method_update',
            })
        })
    })

    describe('getProPlanDetails', () => {
        test('returns parsed pro plan details', async () => {
            mockGet(ENDPOINT_PRO_PLAN_DETAILS, {
                current_plan_status: 'Active',
                downgrade_at: null,
                price_list: [
                    {
                        billing_cycle: 'monthly',
                        prices: [{ currency: 'USD', unit_amount: 600, tax_behavior: 'exclusive' }],
                    },
                ],
            })

            const result = await getTarget().getProPlanDetails()

            expect(result).toEqual({
                currentPlanStatus: 'Active',
                downgradeAt: null,
                priceList: [
                    {
                        billingCycle: 'monthly',
                        prices: [{ currency: 'USD', unitAmount: 600, taxBehavior: 'exclusive' }],
                    },
                ],
            })
        })
    })

    describe('upgradeWorkspace', () => {
        test('sends snake_cased body and returns checkout session url', async () => {
            const getBody = mockPost(ENDPOINT_WORKSPACE_UPGRADE, {
                checkout_session_url: 'https://checkout.stripe.com/ws',
            })

            const result = await getTarget().upgradeWorkspace({
                workspaceId: '42',
                currency: 'USD',
                billingCycle: 'yearly',
                successUrl: 'https://todoist.com/success',
                cancelUrl: 'https://todoist.com/cancel',
            })

            expect(result).toEqual({ checkoutSessionUrl: 'https://checkout.stripe.com/ws' })
            expect(getBody()).toEqual({
                workspace_id: '42',
                currency: 'USD',
                billing_cycle: 'yearly',
                success_url: 'https://todoist.com/success',
                cancel_url: 'https://todoist.com/cancel',
            })
        })
    })

    describe('startWorkspaceTrial', () => {
        test('sends snake_cased body and returns checkout session url', async () => {
            const getBody = mockPost(ENDPOINT_WORKSPACE_TRIAL, {
                checkout_session_url: 'https://checkout.stripe.com/ws-trial',
            })

            const result = await getTarget().startWorkspaceTrial({
                workspaceId: '42',
                currency: 'USD',
                billingCycle: 'monthly',
                successUrl: 'https://todoist.com/success',
                cancelUrl: 'https://todoist.com/cancel',
            })

            expect(result).toEqual({ checkoutSessionUrl: 'https://checkout.stripe.com/ws-trial' })
            expect(getBody()).toEqual({
                workspace_id: '42',
                currency: 'USD',
                billing_cycle: 'monthly',
                success_url: 'https://todoist.com/success',
                cancel_url: 'https://todoist.com/cancel',
            })
        })
    })

    describe('createWorkspaceBillingPortalSession', () => {
        test('sends snake_cased body and returns billing portal url', async () => {
            const getBody = mockPost(ENDPOINT_WORKSPACE_BILLING_PORTAL, {
                billing_portal_url: 'https://billing.stripe.com/ws',
            })

            const result = await getTarget().createWorkspaceBillingPortalSession({
                workspaceId: '42',
                returnUrl: 'https://todoist.com/app/settings',
                flowType: 'payment_method_update',
            })

            expect(result).toEqual({ billingPortalUrl: 'https://billing.stripe.com/ws' })
            expect(getBody()).toEqual({
                workspace_id: '42',
                return_url: 'https://todoist.com/app/settings',
                flow_type: 'payment_method_update',
            })
        })
    })

    describe('getPrices', () => {
        test('returns parsed prices', async () => {
            mockGet(ENDPOINT_PRICES, {
                pro: [
                    {
                        billing_cycle: 'yearly',
                        prices: [{ currency: 'USD', unit_amount: 6000, tax_behavior: 'exclusive' }],
                    },
                ],
                teams: [
                    {
                        billing_cycle: 'monthly',
                        prices: [{ currency: 'USD', unit_amount: 800, tax_behavior: 'inclusive' }],
                    },
                ],
            })

            const result = await getTarget().getPrices()

            expect(result).toEqual({
                pro: [
                    {
                        billingCycle: 'yearly',
                        prices: [{ currency: 'USD', unitAmount: 6000, taxBehavior: 'exclusive' }],
                    },
                ],
                teams: [
                    {
                        billingCycle: 'monthly',
                        prices: [{ currency: 'USD', unitAmount: 800, taxBehavior: 'inclusive' }],
                    },
                ],
            })
        })
    })

    describe('getPricing', () => {
        test('passes formatted query param and returns version-keyed pricing', async () => {
            const getUrl = mockGet(ENDPOINT_PRICING, {
                latest_pro: 'v25',
                latest_biz: 'v25',
                session_pro: 'v25',
                session_biz: 'v25',
                v25: {
                    pro: { usd: { monthly: 400, yearly: 2900 } },
                    biz: { usd: { monthly: 800, yearly: 7200 } },
                },
            })

            const result = await getTarget().getPricing({ formatted: true })

            expect(getUrl()?.searchParams.get('formatted')).toBe('true')
            expect(result).toEqual({
                latestPro: 'v25',
                latestBiz: 'v25',
                sessionPro: 'v25',
                sessionBiz: 'v25',
                v25: {
                    pro: { usd: { monthly: 400, yearly: 2900 } },
                    biz: { usd: { monthly: 800, yearly: 7200 } },
                },
            })
        })

        test('returns formatted string amounts when requested', async () => {
            mockGet(ENDPOINT_PRICING, {
                latest_pro: 'v25',
                latest_biz: 'v25',
                session_pro: 'v25',
                session_biz: 'v25',
                v25: { pro: { usd: { monthly: '$4', yearly: '$29' } } },
            })

            const result = await getTarget().getPricing({ formatted: true })

            expect(result).toEqual({
                latestPro: 'v25',
                latestBiz: 'v25',
                sessionPro: 'v25',
                sessionBiz: 'v25',
                v25: { pro: { usd: { monthly: '$4', yearly: '$29' } } },
            })
        })
    })
})
