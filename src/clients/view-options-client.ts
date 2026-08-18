import { performSyncRequest } from '../transport/sync-request'
import type { ViewOptions, ViewOptionsDeleteArgs, ViewOptionsSetArgs } from '../types/sync'
import { createCommand } from '../utils/sync-helpers'
import { BaseClient } from './base-client'

/** Internal sub-client for saved view-option reads and writes. */
export class ViewOptionsClient extends BaseClient {
    async getViewOptions(): Promise<ViewOptions[]> {
        const response = await performSyncRequest(this.syncContext, {
            resourceTypes: ['view_options'],
            syncToken: '*',
        })

        return (response.viewOptions ?? []).filter((options) => options.isDeleted !== true)
    }

    async setViewOptions(args: ViewOptionsSetArgs, requestId?: string): Promise<void> {
        await performSyncRequest(
            this.syncContext,
            { commands: [createCommand('view_options_set', args)] },
            { requestId, hasSyncCommands: true },
        )
    }

    async deleteViewOptions(args: ViewOptionsDeleteArgs, requestId?: string): Promise<void> {
        await performSyncRequest(
            this.syncContext,
            { commands: [createCommand('view_options_delete', args)] },
            { requestId, hasSyncCommands: true },
        )
    }
}
