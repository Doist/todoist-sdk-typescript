import { ENDPOINT_SYNC } from '../consts/endpoints'
import { TodoistArgumentError, TodoistRequestError } from '../types'
import type { CustomFetch } from '../types/http'
import {
    type SyncCommand,
    type SyncRequest,
    type SyncResponse,
    DATE_FORMAT_TO_API,
    TIME_FORMAT_TO_API,
    DAY_OF_WEEK_TO_API,
    type UserUpdateArgs,
    type TaskUpdateDateCompleteArgs,
    type UpdateGoalsArgs,
} from '../types/sync'
import { spreadIfDefined } from '../utils/request-helpers'
import { parseSyncResponse } from '../utils/validators'
import { request } from './http-client'

/**
 * Shared context needed to issue Sync API requests.
 *
 * Constructed by {@link TodoistApi} and each {@link BaseClient} subclass so
 * that sub-clients can delegate to {@link performSyncRequest} without
 * rebuilding the HTTP identity on every call.
 */
export type SyncRequestContext = {
    authToken: string
    syncApiBase: string
    customFetch?: CustomFetch
}

function serializeUserUpdateArgs(args: UserUpdateArgs): Record<string, unknown> {
    return {
        ...args,
        ...spreadIfDefined(args.dateFormat, (v) => ({
            dateFormat: DATE_FORMAT_TO_API[v],
        })),
        ...spreadIfDefined(args.timeFormat, (v) => ({
            timeFormat: TIME_FORMAT_TO_API[v],
        })),
        ...spreadIfDefined(args.startDay, (v) => ({
            startDay: DAY_OF_WEEK_TO_API[v],
        })),
        ...spreadIfDefined(args.nextWeek, (v) => ({
            nextWeek: DAY_OF_WEEK_TO_API[v],
        })),
    }
}

function serializeTaskUpdateDateCompleteArgs(
    args: TaskUpdateDateCompleteArgs,
): Record<string, unknown> {
    return {
        ...args,
        isForward: args.isForward ? 1 : 0,
        ...spreadIfDefined(args.resetSubtasks, (v) => ({
            resetSubtasks: v ? 1 : 0,
        })),
    }
}

function serializeUpdateGoalsArgs(args: UpdateGoalsArgs): Record<string, unknown> {
    return {
        ...args,
        ...spreadIfDefined(args.vacationMode, (v) => ({ vacationMode: v ? 1 : 0 })),
        ...spreadIfDefined(args.karmaDisabled, (v) => ({
            karmaDisabled: v ? 1 : 0,
        })),
        ...spreadIfDefined(args.ignoreDays, (v) => ({
            ignoreDays: v.map((day) => {
                const apiValue = DAY_OF_WEEK_TO_API[day]
                if (apiValue === undefined) {
                    throw new TodoistArgumentError(
                        `Invalid ignoreDays entry "${String(day)}". Expected a DayOfWeek (e.g. "Monday").`,
                    )
                }
                return apiValue
            }),
        })),
    }
}

function preprocessSyncCommands(commands: SyncCommand[]): SyncCommand[] {
    return commands.map((cmd): SyncCommand => {
        if (cmd.type === 'user_update')
            return {
                ...cmd,
                args: serializeUserUpdateArgs(cmd.args as UserUpdateArgs),
            }
        if (cmd.type === 'item_update_date_complete')
            return {
                ...cmd,
                args: serializeTaskUpdateDateCompleteArgs(cmd.args as TaskUpdateDateCompleteArgs),
            }
        if (cmd.type === 'update_goals')
            return {
                ...cmd,
                args: serializeUpdateGoalsArgs(cmd.args as UpdateGoalsArgs),
            }
        return cmd
    })
}

/**
 * Makes a request to the Sync API and handles error checking.
 *
 * @param ctx - HTTP identity (auth token, sync API base URI, optional custom fetch).
 * @param syncRequest - The sync request payload.
 * @param options - Optional request identifier and commands flag.
 * @returns The sync response data.
 * @throws TodoistRequestError if sync status contains errors.
 */
export async function performSyncRequest(
    ctx: SyncRequestContext,
    syncRequest: SyncRequest,
    options: { requestId?: string; hasSyncCommands?: boolean } = {},
): Promise<SyncResponse> {
    const { requestId, hasSyncCommands = false } = options
    const processedRequest = syncRequest.commands?.length
        ? {
              ...syncRequest,
              commands: preprocessSyncCommands(syncRequest.commands),
          }
        : syncRequest
    const response = await request<Record<string, unknown>>({
        httpMethod: 'POST',
        baseUri: ctx.syncApiBase,
        relativePath: ENDPOINT_SYNC,
        apiToken: ctx.authToken,
        customFetch: ctx.customFetch,
        payload: processedRequest,
        requestId: requestId,
        hasSyncCommands: hasSyncCommands,
    })

    // Check for sync errors and throw if any are found
    if (response.data.syncStatus) {
        Object.entries(response.data.syncStatus).forEach(([_, value]) => {
            if (value === 'ok') return

            throw new TodoistRequestError(value.error, value.httpCode, value.errorExtra)
        })
    }

    return parseSyncResponse(response.data)
}
