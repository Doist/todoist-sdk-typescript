import { ENDPOINT_REST_COMMENTS } from '../consts/endpoints'
import { isSuccess, request } from '../transport/http-client'
import type {
    AddCommentArgs,
    Comment,
    GetCommentsResponse,
    GetProjectCommentsArgs,
    GetTaskCommentsArgs,
    UpdateCommentArgs,
} from '../types/comments'
import { generatePath } from '../utils/request-helpers'
import { IdSchema, validateComment, validateCommentArray } from '../utils/validators'
import { BaseClient } from './base-client'

/**
 * Internal sub-client handling all comment-domain endpoints.
 *
 * Instantiated by `TodoistApi`; every public comment method on `TodoistApi`
 * delegates here. See `todoist-api.ts` for the user-facing JSDoc.
 */
export class CommentClient extends BaseClient {
    async getComments(
        args: GetTaskCommentsArgs | GetProjectCommentsArgs,
    ): Promise<GetCommentsResponse> {
        const {
            data: { results, nextCursor },
        } = await request<GetCommentsResponse>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_COMMENTS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
        })

        return {
            results: validateCommentArray(results),
            nextCursor,
        }
    }

    async getComment(id: string): Promise<Comment> {
        IdSchema.parse(id)
        const response = await request<Comment>({
            httpMethod: 'GET',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_COMMENTS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
        })

        return validateComment(response.data)
    }

    async addComment(args: AddCommentArgs, requestId?: string): Promise<Comment> {
        const { uidsToNotify, ...rest } = args
        const response = await request<Comment>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: ENDPOINT_REST_COMMENTS,
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: {
                ...rest,
                ...(uidsToNotify ? { uidsToNotify: uidsToNotify.join(',') } : {}),
            },
            requestId: requestId,
        })

        return validateComment(response.data)
    }

    async updateComment(id: string, args: UpdateCommentArgs, requestId?: string): Promise<Comment> {
        IdSchema.parse(id)
        const response = await request<Comment>({
            httpMethod: 'POST',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_COMMENTS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            payload: args,
            requestId: requestId,
        })
        return validateComment(response.data)
    }

    async deleteComment(id: string, requestId?: string): Promise<boolean> {
        IdSchema.parse(id)
        const response = await request({
            httpMethod: 'DELETE',
            baseUri: this.syncApiBase,
            relativePath: generatePath(ENDPOINT_REST_COMMENTS, id),
            apiToken: this.authToken,
            customFetch: this.customFetch,
            requestId: requestId,
        })
        return isSuccess(response)
    }
}
