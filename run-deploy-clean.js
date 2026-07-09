
import { execSync } from 'child_process';

const env = { ...process.env };
delete env.VERCEL_ORG_ID;
delete env.VERCEL_TEAM_ID;
delete env.VERCEL_PROJECT_ID;

console.log('Running run-deploy.js with cleaned environment...');
try {
    execSync('npx tsx run-deploy.js', { env, stdio: 'inherit' });
} catch (e) {
    console.error('Deployment failed even with clean env');
}
