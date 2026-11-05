# Host data setup

The host lists, account URL, and manifest contain environment-specific details
and are excluded from Git. To set up the extension, copy the manifest and
constants templates, plus the host-list templates you need:

```sh
cp data/hosts.template.json data/hosts.json
cp data/constants.template.js data/constants.js
cp data/sap-non-prod-hosts.template.js data/sap-non-prod-hosts.js
cp data/sap-prod-hosts.template.js data/sap-prod-hosts.js
```

Set `constantsFile` and `hostFiles` in `data/hosts.json` to the filenames you
copied. Include one host file for one environment or multiple files for multiple
environments. Adding or removing an environment does not require changing
`popup.html` or the application code.

Set `AWS_ACCOUNT_SWITCH_URL` in `data/constants.js` to your account portal URL.

Each host file must assign an array to a uniquely named global variable ending
in `_HOSTS`. Each host needs an `instanceId`, `name`, `region` (availability
zone, such as `us-west-2a`), `hostname`, and `ipAddress`. Non-production
entries use `platform`; production entries use `platformName`.
