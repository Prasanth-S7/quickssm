# QuickSSM

A browser extension to quickly find AWS EC2 instances and connect to them through SSM Session Manager.

## Features

- Search EC2 instances by hostname
- View instance details such as instance ID and tags
- Quickly open an SSM Session Manager connection
- Reduces repeated navigation through the AWS Console
- Useful when working across environments with hundreds of EC2 instances

## How it works

```text
QuickSSM
   │
   │ Search hostname
   ▼
EC2 Instance
   │
   │ Instance ID
   ▼
AWS Console
   │
   ▼
SSM Session Manager
```

QuickSSM keeps a searchable list of EC2 instances and their corresponding instance IDs. Selecting a server opens the AWS SSM Session Manager flow for that instance.

## Setup

Clone the repository:

```bash
git clone https://github.com/Prasanth-S7/quickssm.git
cd quickssm
```

Create local data files from the templates:

```bash
cp data/hosts.template.json data/hosts.json
cp data/constants.template.js data/constants.js
cp data/sap-non-prod-hosts.template.js data/sap-non-prod-hosts.js
cp data/sap-prod-hosts.template.js data/sap-prod-hosts.js
```

Replace the example host entries with your own and set your account portal URL
in `data/constants.js`. In `data/hosts.json`, set `hostFiles` to the host-list
files you created. Include one file for a single environment or multiple files
for multiple environments. See [`data/README.md`](data/README.md) for the host entry format.

Load the project directory (the one containing `manifest.json`) in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Select **Load unpacked**
4. Select the cloned project directory

## Usage

1. Open QuickSSM from the browser.
2. Search for the required server.
3. Select the matching EC2 instance.
4. Open the instance through AWS SSM Session Manager.

AWS authentication and access to the instance are still controlled by the user's existing AWS account and IAM permissions.
