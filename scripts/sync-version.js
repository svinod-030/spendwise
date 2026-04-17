const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const appJsonPath = path.resolve(__dirname, '../app.json');
const constantsPath = path.resolve(__dirname, '../src/utils/constants.ts');
const buildGradlePath = path.resolve(__dirname, '../android/app/build.gradle');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`Syncing version to ${version}...`);

let currentVersionCode = 1;

// Update app.json
if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    appJson.expo.version = version;

    // Increment Android versionCode
    if (appJson.expo.android && typeof appJson.expo.android.versionCode === 'number') {
        appJson.expo.android.versionCode += 1;
        currentVersionCode = appJson.expo.android.versionCode;
    } else {
        if (!appJson.expo.android) appJson.expo.android = {};
        appJson.expo.android.versionCode = currentVersionCode;
    }

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
    console.log(`Updated app.json: version=${version}, versionCode=${currentVersionCode}`);
}

// Update src/utils/constants.ts
if (fs.existsSync(constantsPath)) {
    let constantsContent = fs.readFileSync(constantsPath, 'utf8');
    constantsContent = constantsContent.replace(
        /APP_VERSION:\s*['"][^'"]*['"]/,
        `APP_VERSION: '${version}'`
    );
    fs.writeFileSync(constantsPath, constantsContent);
    console.log(`Updated src/utils/constants.ts to version ${version}`);
}

// Update android/app/build.gradle
if (fs.existsSync(buildGradlePath)) {
    let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');

    // Sync versionName
    gradleContent = gradleContent.replace(
        /versionName\s+["'][^"']*["']/,
        `versionName "${version}"`
    );

    // Sync versionCode
    gradleContent = gradleContent.replace(
        /versionCode\s+\d+/,
        `versionCode ${currentVersionCode}`
    );

    fs.writeFileSync(buildGradlePath, gradleContent);
    console.log(`Updated android/app/build.gradle: versionName=${version}, versionCode=${currentVersionCode}`);
}

console.log('Advanced version sync complete!');
