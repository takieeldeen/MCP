"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIssueDetails = getIssueDetails;
exports.getStatusId = getStatusId;
exports.getSubtaskTypeId = getSubtaskTypeId;
exports.changeIssueStatus = changeIssueStatus;
exports.addIssueComment = addIssueComment;
exports.getUserAccountId = getUserAccountId;
exports.assignUserToIssue = assignUserToIssue;
exports.createFESubtask = createFESubtask;
const axios_1 = __importDefault(require("axios"));
const JIRA_URL = `https://${process.env.JIRA_DOMAIN}.atlassian.net/rest/api/3`;
const JIRA_AUTH = {
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_API_KEY,
};
const jiraAxios = axios_1.default.create({
    baseURL: JIRA_URL,
    auth: JIRA_AUTH,
});
async function getIssueDetails(issueId) {
    try {
        const URL = `/issue/${issueId}`;
        const res = await jiraAxios.get(URL);
        return res?.data;
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: "Something went wrong while getting the specified issue details",
                },
            ],
        };
    }
}
async function getStatusId(issueId, statusName) {
    try {
        const URL = `/issue/${issueId}/transitions`;
        const res = await jiraAxios.get(URL);
        return res?.data?.transitions?.find((status) => status?.name === statusName)?.id;
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: "Something went wrong while updating jira status",
                },
            ],
        };
    }
}
async function getSubtaskTypeId() {
    try {
        const URL = `/issuetype`;
        const res = await jiraAxios.get(URL);
        return res?.data?.find((type) => type?.subtask === true)?.id;
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: "Something went wrong while fetching Jira issue type",
                },
            ],
        };
    }
}
async function changeIssueStatus(issueId, newStatus) {
    try {
        const URL = `/issue/${issueId}/transitions`;
        const statusId = await getStatusId(issueId, newStatus);
        await jiraAxios.post(URL, {
            transition: {
                id: statusId,
            },
        });
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: "Something went wrong while updating jira status",
                },
            ],
        };
    }
}
async function addIssueComment(issueId, variant) {
    try {
        const URL = `/issue/${issueId}/comment`;
        switch (variant) {
            case "PR_CREATION":
                await jiraAxios.post(URL, {
                    text: "Pull Request was submitted succesfully and waiting for reviewing and approval.",
                    type: "text",
                });
                break;
        }
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: "Something went wrong while adding a comment on jira issue",
                },
            ],
        };
    }
}
// Get Jira user accountId by username/email
async function getUserAccountId(usernameOrEmail) {
    try {
        const URL = `/user/search?query=${encodeURIComponent(usernameOrEmail)}`;
        const res = await jiraAxios.get(URL);
        // Jira may return multiple matches, pick the first one
        return res?.data?.[0]?.accountId;
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: "Something went wrong while fetching Jira user accountId",
                },
            ],
        };
    }
}
// Assign Jira user to an issue
async function assignUserToIssue(issueId) {
    try {
        const usernameOrEmail = process?.env?.JIRA_USERNAME;
        const accountId = await getUserAccountId(usernameOrEmail);
        if (!accountId) {
            return {
                content: [
                    {
                        type: "text",
                        text: `User not found with query: ${usernameOrEmail}`,
                    },
                ],
            };
        }
        const URL = `/issue/${issueId}/assignee`;
        await jiraAxios.put(URL, { accountId });
        return { success: true, issueId, accountId };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: "Something went wrong while assigning user to Jira issue",
                },
            ],
        };
    }
}
async function createFESubtask(issueId) {
    try {
        // Get subtask type ID dynamically
        const subtaskTypeId = await getSubtaskTypeId();
        if (!subtaskTypeId) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Could not find a Sub-task issue type in Jira",
                    },
                ],
            };
        }
        // Get my accountId from env JIRA_USERNAME
        const usernameOrEmail = process?.env?.JIRA_USERNAME;
        const accountId = await getUserAccountId(usernameOrEmail);
        if (!accountId) {
            return {
                content: [
                    {
                        type: "text",
                        text: `User not found with query: ${usernameOrEmail}`,
                    },
                ],
            };
        }
        // Construct payload
        const payload = {
            fields: {
                project: {
                    key: process?.env?.JIRA_PROJECT_KEY,
                },
                parent: {
                    key: issueId,
                },
                summary: "FE",
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    text: "Do the front-end work for feature the feature",
                                    type: "text",
                                },
                            ],
                        },
                    ],
                },
                issuetype: {
                    id: "10003",
                },
                assignee: {
                    accountId: await getUserAccountId(usernameOrEmail),
                },
            },
        };
        // Create the subtask
        const URL = `/issue`;
        const res = await jiraAxios.post(URL, payload);
        return {
            success: true,
            subtaskKey: res?.data?.key,
            subtaskId: res?.data?.id,
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: "Something went wrong while creating Jira subtask",
                },
            ],
        };
    }
}
