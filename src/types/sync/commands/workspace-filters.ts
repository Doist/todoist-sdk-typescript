import type { ColorKey } from '../../../utils/colors'

export type WorkspaceFilterAddArgs = {
    workspaceId: string
    name: string
    query: string
    description?: string | null
    color?: ColorKey
    itemOrder?: number
    isFavorite?: boolean
}

export type WorkspaceFilterUpdateArgs = {
    id: string
    name?: string
    query?: string
    description?: string | null
    color?: ColorKey
    itemOrder?: number
    isFavorite?: boolean
}

export type WorkspaceFilterUpdateOrdersArgs = {
    idOrderMapping: Record<string, number>
}

export type WorkspaceFilterDeleteArgs = {
    id: string
}
