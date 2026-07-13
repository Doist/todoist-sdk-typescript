import {
    Label,
    Section,
    Task,
    User,
    Attachment,
    Duration,
    Deadline,
    RawComment,
    PersonalProject,
    WorkspaceProject,
    Reminder,
    Folder,
    App,
    AppWithUserCount,
    AppSecrets,
    AppVerificationToken,
    AppTestToken,
    AppDistributionToken,
    AppWebhook,
    AppInstallation,
    UserAuthorization,
    UiExtension,
} from '../types'
import type { Collaborator, CollaboratorState } from '../types/sync/resources/collaborators'
import type { Note } from '../types/sync/resources/notes'
import { getProjectUrl, getTaskUrl, getSectionUrl } from '../utils/url-helpers'

export const DEFAULT_TASK_ID = '1234'
export const DEFAULT_TASK_CONTENT = 'This is a task'
export const DEFAULT_TASK_DESCRIPTION = 'A description'
export const DEFAULT_TASK_PRIORITY = 1
export const DEFAULT_ORDER = 3
export const DEFAULT_PROJECT_ID = '123'
export const DEFAULT_PROJECT_NAME = 'This is a project'
export const DEFAULT_PROJECT_VIEW_STYLE = 'list'
const DEFAULT_LABEL_ID = '456'
const DEFAULT_LABEL_NAME = 'This is a label'
const DEFAULT_SECTION_ID = '456'
const DEFAULT_SECTION_NAME = 'This is a section'
const DEFAULT_PARENT_ID = '5678'
const DEFAULT_ASSIGNEE = '1234'
const DEFAULT_CREATOR = '1234'
const DEFAULT_DATE = '2020-09-08T12:00:00Z'
function defaultDate() {
    return new Date(DEFAULT_DATE)
}
const DEFAULT_ENTITY_COLOR = 'berry_red'
const DEFAULT_LABELS = ['personal', 'work', 'hobby']
const DEFAULT_USER_ID = '5'
const DEFAULT_USER_NAME = 'A User'
const DEFAULT_USER_EMAIL = 'atestuser@doist.com'
const DEFAULT_COMMENT_ID = '4'
const DEFAULT_COMMENT_CONTENT = 'A comment'
const DEFAULT_COMMENT_REACTIONS = { '👍': ['1234', '5678'] }
const DEFAULT_CAN_ASSIGN_TASKS = true
const DEFAULT_IS_ARCHIVED = false
const DEFAULT_IS_DELETED = false
const DEFAULT_IS_FROZEN = false
const DEFAULT_IS_COLLAPSED = false

// URL constants using the helper functions
const DEFAULT_TASK_URL = getTaskUrl(DEFAULT_TASK_ID, DEFAULT_TASK_CONTENT)
const DEFAULT_PROJECT_URL = getProjectUrl(DEFAULT_PROJECT_ID, DEFAULT_PROJECT_NAME)
const DEFAULT_SECTION_URL = getSectionUrl(DEFAULT_SECTION_ID, DEFAULT_SECTION_NAME)

export const DEFAULT_AUTH_TOKEN = 'AToken'
export const DEFAULT_REQUEST_ID = 'ARequestID'

export const INVALID_ENTITY_ID = 1234

export const DEFAULT_DUE_DATE = {
    isRecurring: false,
    string: 'a date string',
    date: DEFAULT_DATE,
    lang: 'en',
    timezone: null,
}

export const DEFAULT_DURATION: Duration = {
    amount: 10,
    unit: 'minute',
}

export const DEFAULT_DEADLINE: Deadline = {
    date: '2020-09-08',
    lang: 'en',
}

export const DEFAULT_TASK: Task = {
    id: DEFAULT_TASK_ID,
    userId: DEFAULT_CREATOR,
    projectId: DEFAULT_PROJECT_ID,
    sectionId: DEFAULT_SECTION_ID,
    parentId: DEFAULT_PARENT_ID,
    addedByUid: DEFAULT_CREATOR,
    assignedByUid: DEFAULT_CREATOR,
    responsibleUid: DEFAULT_ASSIGNEE,
    labels: DEFAULT_LABELS,
    deadline: DEFAULT_DEADLINE,
    duration: DEFAULT_DURATION,
    checked: false,
    isDeleted: DEFAULT_IS_DELETED,
    addedAt: defaultDate(),
    completedAt: null,
    updatedAt: defaultDate(),
    due: DEFAULT_DUE_DATE,
    priority: DEFAULT_TASK_PRIORITY,
    childOrder: DEFAULT_ORDER,
    content: DEFAULT_TASK_CONTENT,
    description: DEFAULT_TASK_DESCRIPTION,
    dayOrder: DEFAULT_ORDER,
    isCollapsed: DEFAULT_IS_COLLAPSED,
    isUncompletable: false,
    url: DEFAULT_TASK_URL,
}

export const INVALID_TASK = {
    ...DEFAULT_TASK,
    due: '2020-01-31',
}

export const TASK_WITH_OPTIONALS_AS_NULL: Task = {
    userId: DEFAULT_CREATOR,
    id: DEFAULT_TASK_ID,
    projectId: DEFAULT_PROJECT_ID,
    sectionId: null,
    parentId: null,
    addedByUid: DEFAULT_CREATOR,
    assignedByUid: null,
    responsibleUid: null,
    labels: [],
    deadline: null,
    duration: null,
    checked: false,
    isDeleted: DEFAULT_IS_DELETED,
    addedAt: defaultDate(),
    completedAt: null,
    updatedAt: defaultDate(),
    due: null,
    priority: DEFAULT_TASK_PRIORITY,
    childOrder: DEFAULT_ORDER,
    content: DEFAULT_TASK_CONTENT,
    description: DEFAULT_TASK_DESCRIPTION,
    dayOrder: DEFAULT_ORDER,
    isCollapsed: DEFAULT_IS_COLLAPSED,
    isUncompletable: false,
    url: DEFAULT_TASK_URL,
}

export const DEFAULT_PROJECT: PersonalProject = {
    id: DEFAULT_PROJECT_ID,
    name: DEFAULT_PROJECT_NAME,
    color: DEFAULT_ENTITY_COLOR,
    childOrder: DEFAULT_ORDER,
    parentId: DEFAULT_PROJECT_ID,
    isFavorite: false,
    isShared: false,
    inboxProject: false,
    viewStyle: DEFAULT_PROJECT_VIEW_STYLE,
    canAssignTasks: DEFAULT_CAN_ASSIGN_TASKS,
    isArchived: DEFAULT_IS_ARCHIVED,
    isDeleted: DEFAULT_IS_DELETED,
    isFrozen: DEFAULT_IS_FROZEN,
    createdAt: defaultDate(),
    updatedAt: defaultDate(),
    defaultOrder: DEFAULT_ORDER,
    description: '',
    isCollapsed: DEFAULT_IS_COLLAPSED,
    url: DEFAULT_PROJECT_URL,
}

export const INVALID_PROJECT = {
    ...DEFAULT_PROJECT,
    name: 123,
}

export const PROJECT_WITH_OPTIONALS_AS_NULL: PersonalProject = {
    ...DEFAULT_PROJECT,
    parentId: null,
}

export const DEFAULT_WORKSPACE_PROJECT: WorkspaceProject = {
    id: DEFAULT_PROJECT_ID,
    name: DEFAULT_PROJECT_NAME,
    color: DEFAULT_ENTITY_COLOR,
    childOrder: DEFAULT_ORDER,
    isFavorite: false,
    isShared: true,
    viewStyle: DEFAULT_PROJECT_VIEW_STYLE,
    canAssignTasks: DEFAULT_CAN_ASSIGN_TASKS,
    isArchived: DEFAULT_IS_ARCHIVED,
    isDeleted: DEFAULT_IS_DELETED,
    isFrozen: DEFAULT_IS_FROZEN,
    createdAt: defaultDate(),
    updatedAt: defaultDate(),
    defaultOrder: DEFAULT_ORDER,
    description: '',
    isCollapsed: DEFAULT_IS_COLLAPSED,
    url: DEFAULT_PROJECT_URL,
    workspaceId: '100',
    folderId: null,
    collaboratorRoleDefault: 'READ_WRITE',
    isInviteOnly: false,
    isLinkSharingEnabled: true,
    role: 'ADMIN',
    status: 'ACTIVE',
}

export const DEFAULT_SECTION: Section = {
    id: DEFAULT_SECTION_ID,
    userId: DEFAULT_USER_ID,
    projectId: DEFAULT_PROJECT_ID,
    addedAt: new Date('2025-03-28T14:01:23.334881Z'),
    updatedAt: new Date('2025-03-28T14:01:23.334885Z'),
    archivedAt: null,
    name: DEFAULT_SECTION_NAME,
    description: null,
    sectionOrder: DEFAULT_ORDER,
    isArchived: false,
    isDeleted: false,
    isCollapsed: false,
    url: DEFAULT_SECTION_URL,
}

export const INVALID_SECTION = {
    ...DEFAULT_SECTION,
    projectId: undefined,
}

export const DEFAULT_LABEL: Label = {
    id: DEFAULT_LABEL_ID,
    name: DEFAULT_LABEL_NAME,
    color: DEFAULT_ENTITY_COLOR,
    order: DEFAULT_ORDER,
    isFavorite: false,
}

export const INVALID_LABEL = {
    ...DEFAULT_LABEL,
    isFavorite: 'true',
}

export const DEFAULT_USER: User = {
    id: DEFAULT_USER_ID,
    name: DEFAULT_USER_NAME,
    email: DEFAULT_USER_EMAIL,
}

export const INVALID_USER = {
    ...DEFAULT_USER,
    email: undefined,
}

export const DEFAULT_ATTACHMENT: Attachment = {
    resourceType: 'file',
    fileType: 'image/png',
    fileUrl: 'https://someurl.com/image.jpg',
    uploadState: 'completed',
}

export const INVALID_ATTACHMENT = {
    ...DEFAULT_ATTACHMENT,
    uploadState: 'something random',
}

export const DEFAULT_RAW_COMMENT: RawComment = {
    id: DEFAULT_COMMENT_ID,
    postedUid: DEFAULT_USER_ID,
    content: DEFAULT_COMMENT_CONTENT,
    fileAttachment: DEFAULT_ATTACHMENT,
    uidsToNotify: null,
    isDeleted: false,
    postedAt: defaultDate(),
    reactions: DEFAULT_COMMENT_REACTIONS,
    itemId: DEFAULT_TASK_ID,
}

export const DEFAULT_COMMENT = {
    ...DEFAULT_RAW_COMMENT,
    taskId: DEFAULT_RAW_COMMENT.itemId,
    itemId: undefined,
}

export const DEFAULT_REMINDER_ID = '6XGgmFQrx44wfGHr'

export const DEFAULT_RELATIVE_REMINDER: Reminder = {
    id: DEFAULT_REMINDER_ID,
    itemId: DEFAULT_TASK_ID,
    notifyUid: DEFAULT_USER_ID,
    isDeleted: false,
    type: 'relative',
    minuteOffset: 30,
    due: DEFAULT_DUE_DATE,
    isUrgent: false,
}

export const DEFAULT_ABSOLUTE_REMINDER: Reminder = {
    id: DEFAULT_REMINDER_ID,
    itemId: DEFAULT_TASK_ID,
    notifyUid: DEFAULT_USER_ID,
    isDeleted: false,
    type: 'absolute',
    due: DEFAULT_DUE_DATE,
    isUrgent: true,
}

export const DEFAULT_LOCATION_REMINDER: Reminder = {
    id: DEFAULT_REMINDER_ID,
    itemId: DEFAULT_TASK_ID,
    notifyUid: DEFAULT_USER_ID,
    isDeleted: false,
    type: 'location',
    name: 'Aliados',
    locLat: '41.148581',
    locLong: '-8.610945000000015',
    locTrigger: 'on_enter',
    radius: 100,
}

export const INVALID_COMMENT = {
    ...DEFAULT_RAW_COMMENT,
    isDeleted: 'true',
}

export const RAW_COMMENT_WITH_OPTIONALS_AS_NULL_TASK: RawComment = {
    ...DEFAULT_RAW_COMMENT,
    fileAttachment: null,
    uidsToNotify: null,
    reactions: null,
}

export const COMMENT_WITH_OPTIONALS_AS_NULL_TASK = {
    ...RAW_COMMENT_WITH_OPTIONALS_AS_NULL_TASK,
    taskId: RAW_COMMENT_WITH_OPTIONALS_AS_NULL_TASK.itemId,
    itemId: undefined,
}

export const RAW_COMMENT_WITH_ATTACHMENT_WITH_OPTIONALS_AS_NULL: RawComment = {
    ...DEFAULT_RAW_COMMENT,
    fileAttachment: {
        resourceType: 'file',
        fileName: null,
        fileSize: null,
        fileType: null,
        fileDuration: null,
        uploadState: null,
        image: null,
        imageWidth: null,
        imageHeight: null,
        url: null,
        title: null,
    },
}

export const COMMENT_WITH_ATTACHMENT_WITH_OPTIONALS_AS_NULL = {
    ...RAW_COMMENT_WITH_ATTACHMENT_WITH_OPTIONALS_AS_NULL,
    taskId: RAW_COMMENT_WITH_ATTACHMENT_WITH_OPTIONALS_AS_NULL.itemId,
    itemId: undefined,
}

export const RAW_COMMENT_WITH_OPTIONALS_AS_NULL_PROJECT: RawComment = {
    ...DEFAULT_RAW_COMMENT,
    itemId: undefined,
    projectId: DEFAULT_PROJECT_ID,
}

export const COMMENT_WITH_OPTIONALS_AS_NULL_PROJECT = {
    ...RAW_COMMENT_WITH_OPTIONALS_AS_NULL_PROJECT,
    taskId: undefined,
}

export const DEFAULT_FOLDER: Folder = {
    id: '789',
    name: 'This is a folder',
    workspaceId: '100',
    defaultOrder: 3,
    childOrder: 3,
    isDeleted: false,
}

export const DEFAULT_COLLABORATOR: Collaborator = {
    id: DEFAULT_USER_ID,
    email: DEFAULT_USER_EMAIL,
    fullName: DEFAULT_USER_NAME,
    timezone: 'UTC',
    imageId: null,
}

export const DEFAULT_COLLABORATOR_STATE: CollaboratorState = {
    userId: DEFAULT_USER_ID,
    projectId: DEFAULT_PROJECT_ID,
    state: 'active',
    isDeleted: false,
}

export const DEFAULT_APP_ID = '42'
export const DEFAULT_INSTALLATION_ID = '1001'
export const DEFAULT_UI_EXTENSION_ID = '2002'
export const DEFAULT_DISTRIBUTION_TOKEN = 'dist-token-abc'
export const DEFAULT_ACCESS_TOKEN_ID = '3003'

export const DEFAULT_APP: App = {
    id: DEFAULT_APP_ID,
    clientId: 'client-id-xyz',
    status: 'public',
    displayName: 'Sample App',
    userId: DEFAULT_USER_ID,
    createdAt: defaultDate(),
    serviceUrl: 'https://example.com',
    oauthRedirectUri: 'https://example.com/callback',
    description: 'A sample app',
    iconSm: 'https://example.com/icon-sm.png',
    iconMd: 'https://example.com/icon-md.png',
    iconLg: 'https://example.com/icon-lg.png',
    appTokenScopes: ['data:read', 'task:add'],
}

export const DEFAULT_APP_WITH_USER_COUNT: AppWithUserCount = {
    ...DEFAULT_APP,
    userCount: 12,
}

export const DEFAULT_APP_SECRETS: AppSecrets = {
    clientId: 'client-id-xyz',
    clientSecret: 'client-secret-xyz',
}

export const DEFAULT_APP_VERIFICATION_TOKEN: AppVerificationToken = {
    verificationToken: 'verif-token-abc',
}

export const DEFAULT_APP_TEST_TOKEN: AppTestToken = {
    accessToken: 'test-token-xyz',
}

export const DEFAULT_APP_DISTRIBUTION_TOKEN: AppDistributionToken = {
    distributionToken: DEFAULT_DISTRIBUTION_TOKEN,
}

export const DEFAULT_APP_WEBHOOK: AppWebhook = {
    status: 'active',
    callbackUrl: 'https://example.com/webhook',
    version: '1',
    events: ['item:added', 'item:completed'],
}

export const DEFAULT_APP_INSTALLATION: AppInstallation = {
    id: DEFAULT_INSTALLATION_ID,
    creator: DEFAULT_USER_ID,
    createdTs: 1700000000,
    installationType: 'user',
    appTokenScopesValidated: true,
    integration: DEFAULT_APP,
}

export const DEFAULT_USER_AUTHORIZATION: UserAuthorization = {
    accessTokenId: DEFAULT_ACCESS_TOKEN_ID,
    scope: ['data:read', 'task:add'],
    scopeDescriptions: ['Read data', 'Add tasks'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    app: {
        id: DEFAULT_APP_ID,
        displayName: 'Sample App',
        description: 'A sample app',
        serviceUrl: 'https://example.com',
        iconMd: 'https://example.com/icon-md.png',
    },
}

export const DEFAULT_UI_EXTENSION: UiExtension = {
    id: DEFAULT_UI_EXTENSION_ID,
    integrationId: DEFAULT_APP_ID,
    extensionId: 'ext-guid-1',
    extensionType: 'context-menu',
    contextType: 'task',
    url: 'https://example.com/extension',
    icon: 'https://example.com/icon.png',
    name: 'My Extension',
    description: 'Does things in the task context menu',
    width: 400,
    height: 600,
    defVersion: 2,
    minimumCardistVersion: '0.60',
}

export const DEFAULT_NOTE: Note = {
    id: DEFAULT_COMMENT_ID,
    projectId: DEFAULT_PROJECT_ID,
    content: DEFAULT_COMMENT_CONTENT,
    postedAt: defaultDate(),
    fileAttachment: DEFAULT_ATTACHMENT,
    postedUid: DEFAULT_USER_ID,
    uidsToNotify: null,
    reactions: DEFAULT_COMMENT_REACTIONS,
    isDeleted: false,
}
