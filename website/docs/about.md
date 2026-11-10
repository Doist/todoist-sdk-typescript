---
sidebar_label: About
sidebar_position: 1
slug: /
---

# Todoist SDK

This is the official TypeScript SDK for the Todoist API.

## Installation

```bash
npm install @todoist/todoist-sdk
```

## Basic Usage

Here's how to initialize the API client and fetch tasks:

```typescript
import { TodoistApi } from '@todoist/todoist-sdk'

const api = new TodoistApi('YOUR_API_TOKEN')

api.getTask('6X4Vw2Hfmg73Q2XR')
    .then((task) => console.log(task))
    .catch((error) => console.log(error))
```

Explore all available methods in [TodoistApi](/api/classes/TodoistApi).
