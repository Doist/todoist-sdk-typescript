import {
    ENDPOINT_PAYMENTS_CANCEL_PLAN,
    ENDPOINT_PAYMENTS_REACTIVATE_PLAN,
    ENDPOINT_PAYMENTS_SUBSCRIPTION_INFO,
    ENDPOINT_PRICES,
    ENDPOINT_PRICING,
    ENDPOINT_PRO_BILLING_PORTAL,
    ENDPOINT_PRO_PLAN_DETAILS,
    ENDPOINT_PRO_TRIAL,
    ENDPOINT_PRO_UPGRADE,
    ENDPOINT_WORKSPACE_BILLING_PORTAL,
    ENDPOINT_WORKSPACE_TRIAL,
    ENDPOINT_WORKSPACE_UPGRADE,
} from '../consts/endpoints'
import { request } from '../transport/http-client'
import type {
    BillingPortalUrlResponse,
    CancelPlanArgs,
    CheckoutSessionResponse,
    GetPricingArgs,
    PricesResponse,
    PricingResponse,
    ProBillingPortalArgs,
    ProPlanDetails,
    StartProTrialArgs,
    StartWorkspaceTrialArgs,
    SubscriptionInfo,
    UpgradeToProArgs,
    UpgradeWorkspaceArgs,
    WorkspaceBillingPortalArgs,
} from '../types/billing'
import {
    validatePricing,
    validatePrices,
    validateProPlanDetails,
    validateSubscriptionInfo,
} from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all billing-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public billing method on `TodoistApi`
 * delegates here. See `todoist-api.ts` for the user-facing JSDoc.
 */
export class BillingClient extends BaseClient {
    async getSubscriptionInfo(): Promise<SubscriptionInfo> {
        const response = await request<SubscriptionInfo>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_PAYMENTS_SUBSCRIPTION_INFO,
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })
        return validateSubscriptionInfo(response.data)
    }

    async cancelPlan(args?: CancelPlanArgs, requestId?: string): Promise<BillingPortalUrlResponse> {
        const response = await request<BillingPortalUrlResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_PAYMENTS_CANCEL_PLAN,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return response.data
    }

    async reactivatePlan(requestId?: string): Promise<SubscriptionInfo> {
        const response = await request<SubscriptionInfo>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_PAYMENTS_REACTIVATE_PLAN,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return validateSubscriptionInfo(response.data)
    }

    async upgradeToPro(
        args: UpgradeToProArgs,
        requestId?: string,
    ): Promise<CheckoutSessionResponse> {
        const response = await request<CheckoutSessionResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_PRO_UPGRADE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return response.data
    }

    async startProTrial(
        args: StartProTrialArgs,
        requestId?: string,
    ): Promise<CheckoutSessionResponse> {
        const response = await request<CheckoutSessionResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_PRO_TRIAL,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return response.data
    }

    async createProBillingPortalSession(
        args: ProBillingPortalArgs,
        requestId?: string,
    ): Promise<BillingPortalUrlResponse> {
        const response = await request<BillingPortalUrlResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_PRO_BILLING_PORTAL,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return response.data
    }

    async getProPlanDetails(): Promise<ProPlanDetails> {
        const response = await request<ProPlanDetails>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_PRO_PLAN_DETAILS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })
        return validateProPlanDetails(response.data)
    }

    async upgradeWorkspace(
        args: UpgradeWorkspaceArgs,
        requestId?: string,
    ): Promise<CheckoutSessionResponse> {
        const response = await request<CheckoutSessionResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_UPGRADE,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return response.data
    }

    async startWorkspaceTrial(
        args: StartWorkspaceTrialArgs,
        requestId?: string,
    ): Promise<CheckoutSessionResponse> {
        const response = await request<CheckoutSessionResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_TRIAL,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return response.data
    }

    async createWorkspaceBillingPortalSession(
        args: WorkspaceBillingPortalArgs,
        requestId?: string,
    ): Promise<BillingPortalUrlResponse> {
        const response = await request<BillingPortalUrlResponse>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_WORKSPACE_BILLING_PORTAL,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return response.data
    }

    async getPrices(): Promise<PricesResponse> {
        const response = await request<PricesResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_PRICES,
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })
        return validatePrices(response.data)
    }

    async getPricing(args?: GetPricingArgs): Promise<PricingResponse> {
        const response = await request<PricingResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_PRICING,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })
        return validatePricing(response.data)
    }
}
