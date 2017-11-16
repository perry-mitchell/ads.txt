const deepfreeze = require("deepfreeze");
const getDomainRegex = require("domain-regex");
const objectValues = require("object-values");

const AccountType = deepfreeze({
    DIRECT: "DIRECT",
    RESELLER: "RESELLER"
});

const DEFAULT_OPTIONS = {
    invalidLineAction: "filter" // filter/throw
};
const EMPTY_LINE = /^\s*$/;
const VARIABLE_DEFINITION = /^([a-zA-Z]+)=(.+)$/;

/**
 * Ads.txt file manifest
 * @typedef {Object} AdsTxtManifest
 * @property {Object} variables - All variables used in the ads.txt
 */

function createDataField(line) {
    const { main: commentStrippedLine, comment} = stripComment(line);
    const [domain, publisherAccountID, accountType, certificateAuthorityID] = commentStrippedLine
        .split(",")
        .map(item => decodeURIComponent(item.trim()));
    const output = {
        domain,
        publisherAccountID,
        accountType,
        certificateAuthorityID
    };
    if (comment && comment.length > 0) {
        output.comment = comment;
    }
    return output;
}

function generateAdsTxt(manifest, header, footer) {
    const { fields, variables } = manifest;
    const lines = [
        ...(fields || []).map(field => generateLineForField(field)),
        ...Object.keys(variables || {}).map(key => generateLineForVariable(key, manifest.variables[key]))
    ];
    if (header && header.length > 0) {
        lines.unshift(
            ...header
                .split("\n")
                .map(line => `# ${line}`)
        );
    }
    if (footer && footer.length > 0) {
        lines.push(
            ...footer
                .split("\n")
                .map(line => `# ${line}`)
        );
    }
    return lines.join("\n");
}

function generateLineForField(field) {
    const domainExp = getDomainRegex();
    const { domain, publisherAccountID, accountType, certificateAuthorityID, comment } = field;
    if (domainExp.test(domain) !== true) {
        throw new Error(`Failed generating ads.txt line: Invalid domain: ${domain}`);
    }
    if (!publisherAccountID) {
        throw new Error("Failed generating ads.txt line: Invalid or missing publisher account ID");
    }
    if (isValidAccountType(accountType) !== true) {
        throw new Error(`Failed generating ads.txt line: Invalid account type: ${accountType}`);
    }
    let line = `${domain}, ${publisherAccountID}, ${accountType}`;
    if (certificateAuthorityID && certificateAuthorityID.length > 0) {
        line += `, ${certificateAuthorityID}`;
    }
    if (comment && comment.length > 0) {
        line += ` # ${comment}`;
    }
    return line;
}

function generateLineForVariable(key, value) {
    if (Array.isArray(value)) {
        return value.map(single => `${key}=${single}`).join("\n");
    } else if (typeof value === "string") {
        return `${key}=${value}`;
    } else {
        throw new Error(`Failed generating ads.txt variable line: Invalid variable value: ${value}`);
    }
}

function isComment(line) {
    return /^\s*#/.test(line);
}

function isDataField(line) {
    const { main: commentStrippedLine } = stripComment(line);
    const domainExp = getDomainRegex();
    try {
        const [domain,, accountType] = commentStrippedLine.split(",").map(item => item.trim());
        return [
            domainExp.test(domain),
            isValidAccountType(accountType)
        ].every(result => result);
    } catch (err) {
        // silently fail
        return false;
    }
}

function isValidAccountType(type) {
    return objectValues(AccountType).indexOf(type) >= 0;
}

function isVariableAssignment(line) {
    return VARIABLE_DEFINITION.test(line);
}

function parseAdsTxt(text, parseOptions = {}) {
    const options = Object.assign({}, DEFAULT_OPTIONS, parseOptions);
    const { invalidLineAction } = options;
    if (["filter", "throw"].includes(invalidLineAction) !== true) {
        throw new Error(`Invalid option value for 'invalidLineAction' (must be 'filter' or 'throw'): ${invalidLineAction}`);
    }
    const lines = text.split("\n");
    const dataFields = [];
    const variables = {};
    lines.forEach(line => {
        if (isComment(line) || EMPTY_LINE.test(line)) {
            return;
        }
        if (isVariableAssignment(line)) {
            const [, variableName, value] = line.match(VARIABLE_DEFINITION);
            if (typeof variables[variableName] === "string") {
                variables[variableName] = [
                    variables[variableName],
                    decodeURIComponent(value)
                ];
            } else if (Array.isArray(variables[variableName])) {
                variables[variableName].push(decodeURIComponent(value));
            } else {
                variables[variableName] = decodeURIComponent(value);
            }
        } else if (isDataField(line)) {
            dataFields.push(createDataField(line));
        } else {
            if (invalidLineAction === "throw") {
                throw new Error(`Failed parsing ads.txt: Invalid line: "${line}"`);
            }
        }
    });
    return {
        variables,
        fields: dataFields
    };
}

function stripComment(line) {
    const [main, ...commentParts] = line.split("#");
    return {
        main,
        comment: commentParts.join("#").trim()
    };
}

module.exports = {
    AccountType,
    generateAdsTxt,
    parseAdsTxt
};
