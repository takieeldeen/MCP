import axios from "axios";

const JIRA_URL = `https://${process.env.JIRA_DOMAIN}.atlassian.net/rest/api/3`;
const JIRA_AUTH = {
  username: process.env.JIRA_USERNAME!,
  password: process.env.JIRA_API_KEY!,
};

const jiraAxios = axios.create({
  baseURL: JIRA_URL,
  auth: JIRA_AUTH,
});

export async function getIssueDetails(issueId: string) {
  try {
    const URL = `/issue/${issueId}`;
    const res = await jiraAxios.get(URL);
    return res?.data;
  } catch (err) {
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

export async function getStatusId(issueId: string, statusName: string) {
  try {
    const URL = `/issue/${issueId}/transitions`;
    const res = await jiraAxios.get(URL);
    return res?.data?.transitions?.find(
      (status: any) => status?.name === statusName
    )?.id;
  } catch (err) {
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

export async function getSubtaskTypeId() {
  try {
    const URL = `/issuetype`;
    const res = await jiraAxios.get(URL);

    return res?.data?.find((type: any) => type?.subtask === true)?.id;
  } catch (err) {
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

export async function changeIssueStatus(
  issueId: string,
  newStatus: "To Do" | "In Progress" | "Done"
) {
  try {
    const URL = `/issue/${issueId}/transitions`;
    const statusId = await getStatusId(issueId, newStatus);
    await jiraAxios.post(URL, {
      transition: {
        id: statusId,
      },
    });
  } catch (err) {
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

export async function addIssueComment(issueId: string, variant: "PR_CREATION") {
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
  } catch (err) {
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
export async function getUserAccountId(usernameOrEmail: string) {
  try {
    const URL = `/user/search?query=${encodeURIComponent(usernameOrEmail)}`;
    const res = await jiraAxios.get(URL);
    // Jira may return multiple matches, pick the first one
    return res?.data?.[0]?.accountId;
  } catch (err) {
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
export async function assignUserToIssue(issueId: string) {
  try {
    const usernameOrEmail = process?.env?.JIRA_USERNAME!;
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
  } catch (err) {
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

export async function createFESubtask(issueId: string) {
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
    const usernameOrEmail = process?.env?.JIRA_USERNAME!;
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
  } catch (err) {
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
