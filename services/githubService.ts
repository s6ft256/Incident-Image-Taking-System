
import { FetchedIncident } from '../types';

export const syncToGitHub = async (
  token: string,
  repoName: string,
  userName: string,
  data: FetchedIncident[]
): Promise<string> => {
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    // 1. Ensure Repository Exists
    const repoCheck = await fetch(`https://api.github.com/repos/${userName}/${repoName}`, { headers });
    
    if (repoCheck.status === 404) {
      // Create Repo
      const createRepo = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: repoName,
          description: 'Automated backup of HSE Guardian incident reports.',
          private: true,
          auto_init: true,
        }),
      });
      if (!createRepo.ok) throw new Error("Failed to create backup repository.");
      // Wait for init
      await new Promise(r => setTimeout(r, 2000));
    }

    // 2. Get File SHA (if it exists)
    const filePath = 'incident_reports_backup.json';
    const fileCheck = await fetch(`https://api.github.com/repos/${userName}/${repoName}/contents/${filePath}`, { headers });
    let sha: string | undefined;
    
    if (fileCheck.ok) {
      const fileData = await fileCheck.json();
      sha = fileData.sha;
    }

    // 3. Commit Data
    const content = btoa(JSON.stringify(data, null, 2));
    const commitResponse = await fetch(`https://api.github.com/repos/${userName}/${repoName}/contents/${filePath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `System Sync: ${new Date().toISOString()}`,
        content: content,
        sha: sha,
      }),
    });

    if (!commitResponse.ok) {
      const err = await commitResponse.json();
      throw new Error(err.message || "Failed to commit data to GitHub.");
    }

    return `https://github.com/${userName}/${repoName}/blob/main/${filePath}`;
  } catch (error: any) {
    console.error("GitHub Sync Error:", error);
    throw error;
  }
};
