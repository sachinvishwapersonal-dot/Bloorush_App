const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn, execSync } = require('child_process');

async function getGitToken() {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['credential', 'fill']);
    let out = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => console.error(d.toString()));
    p.on('close', code => {
      if (code !== 0) return reject(new Error('Failed to get git credentials'));
      for (const line of out.split('\n')) {
        if (line.startsWith('password=')) {
          return resolve(line.substring('password='.length).trim());
        }
      }
      reject(new Error('Password/token not found in git credentials'));
    });
    p.stdin.write('protocol=https\nhost=github.com\n\n');
  });
}

function fetchRedirect(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Redirect to blob storage (do not send Authorization header to S3/Azure)
        https.get(res.headers.location, (redirectRes) => {
          if (redirectRes.statusCode >= 300 && redirectRes.statusCode < 400 && redirectRes.headers.location) {
            fetchRedirect(redirectRes.headers.location, {}).then(resolve).catch(reject);
          } else {
            resolve(redirectRes);
          }
        }).on('error', reject);
      } else if (res.statusCode === 200) {
        resolve(res);
      } else {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${body}`)));
      }
    }).on('error', reject);
  });
}

async function downloadArtifact(artifactId, zipFileName, outputApkName) {
  console.log(`Fetching token...`);
  const token = await getGitToken();

  const url = `https://api.github.com/repos/sachinvishwapersonal-dot/Bloorush_App/actions/artifacts/${artifactId}/zip`;
  console.log(`Downloading artifact ${artifactId} from ${url}...`);

  const stream = await fetchRedirect(url, {
    'User-Agent': 'BlooRush-Downloader',
    'Authorization': `Bearer ${token}`
  });

  const zipPath = path.resolve(__dirname, '..', zipFileName);
  const fileWriter = fs.createWriteStream(zipPath);

  await new Promise((resolve, reject) => {
    stream.pipe(fileWriter);
    fileWriter.on('finish', resolve);
    fileWriter.on('error', reject);
  });

  console.log(`Downloaded ${zipFileName} (${fs.statSync(zipPath).size} bytes). Extracting...`);

  // Extract using powershell Expand-Archive or tar
  const extractDir = path.resolve(__dirname, '..', 'temp_apk_extract_' + artifactId);
  if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  execSync(`tar -xf "${zipPath}" -C "${extractDir}"`);

  // Find .apk file inside extracted dir
  const extractedFiles = fs.readdirSync(extractDir);
  console.log('Extracted files:', extractedFiles);

  const apkFile = extractedFiles.find(f => f.endsWith('.apk'));
  if (apkFile) {
    const finalApkPath = path.resolve(__dirname, '..', outputApkName);
    fs.copyFileSync(path.join(extractDir, apkFile), finalApkPath);
    console.log(`Successfully saved: ${finalApkPath} (${fs.statSync(finalApkPath).size} bytes)`);
  } else {
    console.error('No .apk found in zip:', extractedFiles);
  }

  // Cleanup zip and temp dir
  fs.rmSync(zipPath, { force: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
}

// Download Partner APK (id: 10171553166)
downloadArtifact(10171553166, 'partner_artifact.zip', 'bloorush_partner.apk')
  .then(() => console.log('Partner APK Download Complete!'))
  .catch(err => {
    console.error('Download failed:', err);
    process.exit(1);
  });
