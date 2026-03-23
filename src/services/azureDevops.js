const ORG = import.meta.env.VITE_AZURE_DEVOPS_ORG || 'rameswarrath0329';
const PROJECT = import.meta.env.VITE_AZURE_DEVOPS_PROJECT || 'RamAI';
const TEAM = import.meta.env.VITE_AZURE_DEVOPS_TEAM || 'RamAI Team';
const PAT = import.meta.env.VITE_AZURE_DEVOPS_PAT;

const BASE_URL = `/azure-api/${ORG}/${PROJECT}/_apis`;

const getHeaders = (isPatch = false) => {
  if (!PAT) {
    throw new Error('Azure DevOps PAT is missing. Please add it to your .env.local file.');
  }
  return {
    'Authorization': `Basic ${btoa(':' + PAT)}`,
    'Content-Type': isPatch ? 'application/json-patch+json' : 'application/json'
  };
};

export const fetchSprints = async () => {
  try {
    const url = `/azure-api/${ORG}/${PROJECT}/${encodeURIComponent(TEAM)}/_apis/work/teamsettings/iterations?api-version=7.1`;
    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
      throw new Error('Failed to fetch iterations.');
    }
    const data = await response.json();
    return data.value.map(iter => ({
      id: iter.id,
      name: iter.name,
      path: iter.path,
      timeframe: iter.attributes?.timeFrame || 'past'
    }));
  } catch (error) {
    console.error('Error fetching sprints:', error);
    throw error;
  }
};

export const fetchSprintTasks = async (iterationPath) => {
  try {
    const query = {
      query: `Select [System.Id] From WorkItems Where [System.TeamProject] = '${PROJECT}' And [System.IterationPath] = '${iterationPath}'`
    };

    const wiqlResponse = await fetch(`${BASE_URL}/wit/wiql?api-version=7.1`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(query)
    });

    if (!wiqlResponse.ok) {
      throw new Error(`Failed to fetch work items query: ${wiqlResponse.statusText}`);
    }

    const wiqlData = await wiqlResponse.json();
    const workItems = wiqlData.workItems;

    if (!workItems || workItems.length === 0) {
      return [];
    }

    const ids = workItems.map(wi => wi.id).join(',');
    const detailsResponse = await fetch(`${BASE_URL}/wit/workitems?ids=${ids}&api-version=7.1`, {
      headers: getHeaders()
    });

    if (!detailsResponse.ok) {
      throw new Error('Failed to fetch work item details.');
    }

    const detailsData = await detailsResponse.json();
    return detailsData.value.map(item => ({
      id: item.id,
      title: item.fields['System.Title'],
      type: item.fields['System.WorkItemType'],
      state: item.fields['System.State'],
      assignedTo: item.fields['System.AssignedTo']?.displayName || 'Unassigned',
      description: item.fields['System.Description'] || 'No description available.',
      effort: item.fields['Microsoft.VSTS.Scheduling.Effort'] || item.fields['Microsoft.VSTS.Scheduling.StoryPoints'] || 0,
      url: item._links?.html?.href
    }));

  } catch (error) {
    console.error('Error fetching Sprint tasks:', error);
    throw error;
  }
};

export const updateTaskDetails = async (taskId, updates) => {
  try {
    const patchBody = [];

    if (updates.effort !== undefined) {
      patchBody.push({
        op: 'add',
        path: '/fields/Microsoft.VSTS.Scheduling.Effort',
        value: Number(updates.effort)
      });
    }

    if (updates.state !== undefined) {
      patchBody.push({
        op: 'add',
        path: '/fields/System.State',
        value: updates.state
      });
    }

    const response = await fetch(`${BASE_URL}/wit/workitems/${taskId}?api-version=7.1`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify(patchBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Failed to update task:', errText);
      throw new Error(`Failed to update task: ${response.status}`);
    }
    const data = await response.json();
    return {
      effort: data.fields['Microsoft.VSTS.Scheduling.Effort'] || data.fields['Microsoft.VSTS.Scheduling.StoryPoints'] || 0,
      state: data.fields['System.State']
    };
  } catch (err) {
    console.error('Error updating task:', err);
    throw err;
  }
};
