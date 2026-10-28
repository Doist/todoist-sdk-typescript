import { CustomError } from 'ts-custom-error'
import type { SyncError, SyncResponse } from './sync/response'

const authenticationErrorCodes = [401, 403]

export class TodoistRequestError extends CustomError {
    public constructor(
        public message: string,
        public httpStatusCode?: number,
        public responseData?: unknown,
    ) {
        super(message)
        Object.defineProperty(this, 'name', { value: 'TodoistRequestError' })
    }

    isAuthenticationError = (): boolean => {
        if (!this.httpStatusCode) {
            return false
        }

        return authenticationErrorCodes.includes(this.httpStatusCode)
    }
}

/**
 * Thrown when the Sync API accepts a request but one or more of its commands fail.
 *
 * Sync commands are applied independently, so the commands that succeeded have
 * already taken effect. `message`, `httpStatusCode` and `responseData` describe the
 * first failed command, as on a plain {@link TodoistRequestError}, while
 * `syncStatus` and `tempIdMapping` cover every command in the request, so callers
 * can tell which ones were applied.
 */
export class TodoistSyncError extends TodoistRequestError {
    /** Each command's outcome, keyed by the command's `uuid`: `'ok'` or the error it failed with. */
    public syncStatus: NonNullable<SyncResponse['syncStatus']>
    /** Server IDs assigned to the resources the request created, keyed by the command's `tempId`. */
    public tempIdMapping: NonNullable<SyncResponse['tempIdMapping']>

    public constructor(
        firstFailure: SyncError,
        { syncStatus, tempIdMapping }: Pick<TodoistSyncError, 'syncStatus' | 'tempIdMapping'>,
    ) {
        super(firstFailure.error, firstFailure.httpCode, firstFailure.errorExtra)
        Object.defineProperty(this, 'name', { value: 'TodoistSyncError' })
        this.syncStatus = syncStatus
        this.tempIdMapping = tempIdMapping
    }
}

export class TodoistArgumentError extends CustomError {
    public constructor(public message: string) {
        super(message)
        Object.defineProperty(this, 'name', { value: 'TodoistArgumentError' })
    }
}
