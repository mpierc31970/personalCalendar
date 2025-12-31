const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.N8N_API_KEY || process.argv[2];
const WORKFLOW_FILE = process.argv[3] || process.argv[2];
const BASE_URL = 'n8n.srv902909.hstgr.cloud';

if (!API_KEY) {
    console.error('Usage: node update_workflow.js <api_key> <workflow_file>');
    console.error('   or: N8N_API_KEY=<key> node update_workflow.js <workflow_file>');
    process.exit(1);
}

const workflowFile = process.argv[3] || process.argv[2];
const actualApiKey = process.argv[3] ? process.argv[2] : API_KEY;

if (!workflowFile || !workflowFile.endsWith('.json')) {
    console.error('Please provide a workflow JSON file');
    process.exit(1);
}

const workflowPath = path.resolve(workflowFile);
const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const workflowId = workflowData.id;

console.log(`Updating workflow ${workflowId} from ${workflowFile}...`);

const postData = JSON.stringify(workflowData);

const options = {
    hostname: BASE_URL,
    port: 443,
    path: `/api/v1/workflows/${workflowId}`,
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': actualApiKey,
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('Workflow updated successfully!');
            const result = JSON.parse(data);
            console.log(`  Name: ${result.name}`);
            console.log(`  Active: ${result.active}`);
        } else {
            console.error(`Error: ${res.statusCode}`);
            console.error(data);
        }
    });
});

req.on('error', (e) => console.error(`Request error: ${e.message}`));
req.write(postData);
req.end();
