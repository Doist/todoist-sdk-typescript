import { ENDPOINT_SYNC } from '../consts/endpoints'
import { TodoistArgumentError, TodoistSyncError } from '../types'
import type { CustomFetch, CustomHeaders } from '../types/http'
import {
    type SyncCommand,
    type SyncError,
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
    customHeaders?: CustomHeaders
}

// An invalid Date would otherwise be sent as `null`, which the API reads as "no expiry".
function serializeStatusActiveUntil(value: Date | string | null): string | null {
    if (!(value instanceof Date)) return value
    if (Number.isNaN(value.getTime())) {
        throw new TodoistArgumentError('status.activeUntil is an invalid Date')
    }
    return value.toISOString()
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
        ...(args.status
            ? {
                  status: {
                      ...args.status,
                      ...spreadIfDefined(args.status.activeUntil, (v) => ({
                          activeUntil: serializeStatusActiveUntil(v),
                      })),
                  },
              }
            : {}),
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
 * Response fields keyed by the command `uuid` / `tempId` the caller sent. Their
 * keys must reach the caller unchanged so each entry can be matched to its
 * command; camel-casing would rewrite them (`a3bb189e-8bf9-…` → `a3Bb189E8Bf9…`).
 */
const COMMAND_KEYED_FIELDS: ReadonlySet<string> = new Set(['sync_status', 'temp_id_mapping'])

/**
 * Makes a request to the Sync API and handles error checking.
 *
 * @param ctx - HTTP identity (auth token, sync API base URI, optional custom fetch and headers).
 * @param syncRequest - The sync request payload.
 * @param options - Optional request identifier and commands flag.
 * @returns The sync response data, with `syncStatus` keyed by command `uuid` and
 * `tempIdMapping` keyed by command `tempId`.
 * @throws TodoistSyncError if any command failed. Commands are applied
 * independently, so its `syncStatus` and `tempIdMapping` report the ones that
 * were applied regardless.
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
        customHeaders: ctx.customHeaders,
        payload: processedRequest,
        requestId: requestId,
        hasSyncCommands: hasSyncCommands,
        opaqueKeyMaps: COMMAND_KEYED_FIELDS,
    })

    const syncStatus = response.data.syncStatus as SyncResponse['syncStatus']
    const firstFailure = Object.values(syncStatus ?? {}).find(
        (status): status is SyncError => status !== 'ok',
    )
    if (firstFailure) {
        throw new TodoistSyncError(firstFailure, {
            syncStatus: syncStatus ?? {},
            tempIdMapping: (response.data.tempIdMapping as SyncResponse['tempIdMapping']) ?? {},
        })
    }

    return parseSyncResponse(response.data)
}
