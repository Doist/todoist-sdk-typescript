import type { GoalOwnerType } from '../../goals/types'

export type GoalAddArgs = {
    ownerType: GoalOwnerType
    ownerId: string
    name: string
    description?: string | null
    deadline?: string | null
    responsibleUid?: string | null
}

export type GoalUpdateArgs = {
    id: string
    name?: string
    description?: string | null
    deadline?: string | null
    responsibleUid?: string | null
}

export type GoalCompleteArgs = {
    id: string
}

export type GoalUncompleteArgs = {
    id: string
}

export type GoalDeleteArgs = {
    id: string
}

export type GoalLinkItemArgs = {
    goalId: string
    itemId: string
}

export type GoalUnlinkItemArgs = {
    goalId: string
    itemId: string
}
