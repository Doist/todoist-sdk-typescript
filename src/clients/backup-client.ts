import { ENDPOINT_REST_BACKUPS, ENDPOINT_REST_BACKUPS_DOWNLOAD } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { Backup, DownloadBackupArgs, GetBackupsArgs } from '../types/backups'
import type { FileResponse } from '../types/http'
import { headersToRecord } from '../utils/headers'
import { validateBackupArray } from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling backup-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public backup method on
 * `TodoistApi` delegates here. See `todoist-api.ts` for user-facing
 * JSDoc.
 */
export class BackupClient extends BaseClient {
    async getBackups(args: GetBackupsArgs = {}): Promise<Backup[]> {
        const response = await request<unknown[]>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_BACKUPS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })
        return validateBackupArray(response.data)
    }

    async downloadBackup(args: DownloadBackupArgs): Promise<FileResponse> {
        const url = `${this.syncApiBase}${ENDPOINT_REST_BACKUPS_DOWNLOAD}?file=${encodeURIComponent(args.file)}`
        const fetchOptions = {
            headers: { Authorization: `Bearer ${this.authToken}` },
        }

        if (this.customFetch) {
            const response = await this.customFetch(url, fetchOptions)
            if (!response.ok) {
                throw new Error(
                    `Failed to download backup: ${response.status} ${response.statusText}`,
                )
            }
            if (typeof response.arrayBuffer !== 'function') {
                throw new Error(
                    'customFetch response must implement arrayBuffer() for downloadBackup (binary endpoint); reading the body via text() corrupts non-UTF-8 bytes',
                )
            }
            return response as FileResponse
        }

        const response = await fetch(url, fetchOptions)
        if (!response.ok) {
            throw new Error(`Failed to download backup: ${response.status} ${response.statusText}`)
        }
        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: headersToRecord(response.headers),
            text: () => response.text(),
            json: () => response.json(),
            arrayBuffer: () => response.arrayBuffer(),
        }
    }
}
